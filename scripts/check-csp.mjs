import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// The meta CSP only exists in built output, so dev-server tests can't see a
// stale is:inline hash or a Shiki style="" attribute. Runs against dist/.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
        entries.map((entry) => {
            const full = path.join(dir, entry.name)
            return entry.isDirectory() ? walk(full) : [full]
        }),
    )
    return files.flat()
}

let files
try {
    files = await walk(dist)
} catch (error) {
    if (error.code !== 'ENOENT') throw error
    console.error('dist/ not found. Run `npm run build` first.')
    process.exit(1)
}

const htmlFiles = files.filter((f) => f.endsWith('.html'))
if (htmlFiles.length === 0) {
    console.error('No HTML files found in dist/. Is the build output complete?')
    process.exit(1)
}

// Quote-aware, so a `>` inside an attribute value doesn't end the tag early.
const attrsSource = String.raw`((?:[^>"']|"[^"]*"|'[^']*')*)`
const metaPattern = new RegExp(`<meta(?=[\\s/>])${attrsSource}>`, 'gi')
// Comments and raw-text elements in document order, so neither is mistaken
// for the other.
const tokenPattern = new RegExp(
    `<!--[\\s\\S]*?-->|<(script|style)(?=[\\s/>])${attrsSource}>([\\s\\S]*?)</\\1\\s*>`,
    'gi',
)
const tagPattern = new RegExp(`<[a-zA-Z][\\w:-]*${attrsSource}>`, 'g')
const attrPattern =
    /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

function parseAttrs(source) {
    const attrs = new Map()
    for (const [, name, ...values] of source.matchAll(attrPattern)) {
        const key = name.toLowerCase()
        if (!attrs.has(key)) attrs.set(key, values.find((v) => v != null) ?? '')
    }
    return attrs
}

function decodeEntities(value) {
    return value
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
}

function hashList(policy, directive) {
    const entry = policy
        .split(';')
        .map((d) => d.trim().split(/\s+/))
        .find(([name]) => name?.toLowerCase() === directive)
    if (!entry) return null
    return new Set(
        entry
            .slice(1)
            .filter((token) => /^'sha256-/i.test(token))
            .map((token) => token.slice(1, -1)),
    )
}

// Per the HTML spec, any other type is a data block (e.g. JSON-LD) that never
// executes, so script-src doesn't apply to it.
const javascriptTypes =
    /^(?:|module|importmap|speculationrules|(?:application|text)\/(?:x-)?(?:java|ecma)script|text\/javascript1\.[0-5]|text\/(?:jscript|livescript))$/

function excerpt(text) {
    const flat = text.replace(/\s+/g, ' ').trim()
    return flat.length > 60 ? `${flat.slice(0, 60)}...` : flat
}

const problems = []
const pages = []
// "<kind> <hash>" -> the element and every page it appears on.
const inlineElements = new Map()

for (const file of htmlFiles) {
    const page = path.relative(dist, file)
    const html = await fs.readFile(file, 'utf8')

    const meta = [...html.matchAll(metaPattern)].find(
        ([, attrs]) =>
            parseAttrs(attrs).get('http-equiv')?.toLowerCase() ===
            'content-security-policy',
    )
    if (!meta) {
        problems.push(`${page}: no <meta http-equiv="content-security-policy">`)
        continue
    }
    const policy = decodeEntities(parseAttrs(meta[1]).get('content') ?? '')
    const allowed = {
        script: hashList(policy, 'script-src'),
        style: hashList(policy, 'style-src'),
    }
    for (const [kind, hashes] of Object.entries(allowed)) {
        if (!hashes) problems.push(`${page}: meta CSP has no ${kind}-src`)
    }
    pages.push({ page, allowed })

    // A meta CSP only governs what's parsed after it, so BaseLayout's earlier
    // dark-mode script is left to the header's 'unsafe-inline'.
    const metaEnd = meta.index + meta[0].length
    for (const match of html.matchAll(tokenPattern)) {
        const [, name, attrSource, body] = match
        if (!name || match.index < metaEnd) continue
        const kind = name.toLowerCase()
        const attrs = parseAttrs(attrSource)
        if (kind === 'script') {
            if (attrs.has('src')) continue
            const type = (attrs.get('type') ?? '').trim().toLowerCase()
            if (!javascriptTypes.test(type)) continue
        }
        // The parser normalizes newlines before the browser hashes the text.
        const hash = `sha256-${crypto
            .createHash('sha256')
            .update(body.replace(/\r\n?/g, '\n'), 'utf8')
            .digest('base64')}`
        const key = `${kind} ${hash}`
        if (!inlineElements.has(key)) {
            inlineElements.set(key, {
                kind,
                hash,
                label: `<${name}${attrSource}> "${excerpt(body)}"`,
                foundOn: [],
            })
        }
        inlineElements.get(key).foundOn.push(page)
    }

    // Hashes can't cover style="" attributes (that needs 'unsafe-hashes').
    const markup = html.replace(tokenPattern, (_, name, attrSource) =>
        name ? `<${name}${attrSource}></${name}>` : '',
    )
    const styled = [...markup.matchAll(tagPattern)].filter(([, attrSource]) =>
        parseAttrs(attrSource).has('style'),
    )
    if (styled.length > 0) {
        problems.push(
            `${page}: ${styled.length} style attribute(s), first on ${excerpt(styled[0][0])}`,
        )
    }
}

// Checked against every page's policy, not just its own: after a ClientRouter
// navigation the first page's meta CSP is still enforced too.
const where = (list) =>
    list.length > 1 && list.length === pages.length
        ? 'every page'
        : list.join(', ')
for (const { kind, hash, label, foundOn } of inlineElements.values()) {
    const missingOn = pages
        .filter(({ allowed }) => allowed[kind] && !allowed[kind].has(hash))
        .map(({ page }) => page)
    if (missingOn.length > 0) {
        problems.push(
            `${label} on ${where(foundOn)} needs '${hash}' in ${kind}-src on ${where(missingOn)}`,
        )
    }
}

if (inlineElements.size === 0) {
    console.error(
        'No inline scripts or styles after the CSP <meta> in dist/. Is the build output complete?',
    )
    process.exit(1)
}

if (problems.length > 0) {
    console.error(
        'Built HTML the meta CSP will block (see security.csp in astro.config.mjs):',
    )
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

console.log(
    `CSP check passed (${htmlFiles.length} pages, ${inlineElements.size} distinct inline scripts/styles, no style attributes).`,
)
