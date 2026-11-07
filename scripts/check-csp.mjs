import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// The meta CSP only exists in built output and netlify.toml's header CSP only
// in production, so dev-server tests see neither. Runs against dist/.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const toml = await fs.readFile(path.join(root, 'netlify.toml'), 'utf8')
const headerValues = [
    ...toml.matchAll(/^\s*Content-Security-Policy\s*=\s*"([^"]+)"/gm),
].map((match) => match[1])
if (headerValues.length !== 1) {
    console.error(
        `Expected exactly one Content-Security-Policy header in netlify.toml, found ${headerValues.length}.`,
    )
    process.exit(1)
}
const headerPolicy = headerValues[0]

const astroConfig = await fs.readFile(
    path.join(root, 'astro.config.mjs'),
    'utf8',
)
const siteMatch = astroConfig.match(/^\s*site:\s*['"]([^'"]+)['"]/m)
if (!siteMatch) {
    console.error('No site: URL found in astro.config.mjs.')
    process.exit(1)
}
const siteOrigin = new URL(siteMatch[1]).origin

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

function sourceList(policy, directive) {
    const entry = policy
        .split(';')
        .map((d) => d.trim().split(/\s+/))
        .find(([name]) => name?.toLowerCase() === directive)
    return entry ? entry.slice(1) : null
}

function hashList(policy, directive) {
    const sources = sourceList(policy, directive)
    if (!sources) return null
    return new Set(
        sources
            .filter((token) => /^'sha256-/i.test(token))
            .map((token) => token.slice(1, -1)),
    )
}

// The source list the browser actually applies, after CSP's fallback chain.
function effectiveSources(policy, ...directives) {
    for (const directive of [...directives, 'default-src']) {
        const sources = sourceList(policy, directive)
        if (sources) return { directive, sources }
    }
    return null
}

const hashSourcePattern = /^'(sha256|sha384|sha512)-([^']+)'$/i

// CSP3's "allow all inline": a hash or nonce (or, for scripts,
// 'strict-dynamic') in the list makes the browser ignore 'unsafe-inline'.
function disablesUnsafeInline(sources, kind) {
    return sources.some(
        (token) =>
            hashSourcePattern.test(token) ||
            /^'nonce-/i.test(token) ||
            (kind === 'script' && /^'strict-dynamic'$/i.test(token)),
    )
}

function allowsInline(sources, kind, body) {
    for (const token of sources) {
        const [, algorithm, digest] = token.match(hashSourcePattern) ?? []
        if (algorithm && inlineDigest(body, algorithm) === digest) return true
    }
    return (
        sources.some((token) => /^'unsafe-inline'$/i.test(token)) &&
        !disablesUnsafeInline(sources, kind)
    )
}

const defaultPorts = {
    'http:': '80',
    'https:': '443',
    'ws:': '80',
    'wss:': '443',
}
const effectivePort = (url) => url.port || defaultPorts[url.protocol] || ''
// CSP3 lets an http: source also match https: (and ws: match wss:).
const schemeMatches = (source, scheme) =>
    source === scheme ||
    (source === 'http:' && scheme === 'https:') ||
    (source === 'ws:' && scheme === 'wss:')

// Only the source-expression forms this site could plausibly use: 'self',
// scheme sources (data:, https:), * and host sources. Anything else fails.
function allowsUrl(sources, url) {
    const scheme = url.protocol
    return sources.some((token) => {
        if (/^'self'$/i.test(token)) {
            const self = new URL(siteOrigin)
            return (
                url.hostname === self.hostname &&
                schemeMatches(self.protocol, scheme) &&
                effectivePort(url) === defaultPorts[scheme]
            )
        }
        if (token === '*')
            return !['data:', 'blob:', 'filesystem:'].includes(scheme)
        if (/^[a-z][a-z0-9+.-]*:$/i.test(token))
            return schemeMatches(token.toLowerCase(), scheme)
        const host = token.match(
            /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([a-z0-9.-]+)(?::(\d+|\*))?(\/\S*)?$/i,
        )
        if (!host) return false
        const [, rawScheme, wildcard, rawName, port, pathPrefix] = host
        const sourceScheme = rawScheme
            ? `${rawScheme.toLowerCase()}:`
            : 'https:'
        if (!schemeMatches(sourceScheme, scheme)) return false
        const name = rawName.toLowerCase()
        const hostMatches = wildcard
            ? url.hostname.endsWith(`.${name}`)
            : url.hostname === name
        if (!hostMatches) return false
        // No port means the scheme's default; http's 80 also covers https' 443.
        const wanted = port ?? defaultPorts[sourceScheme]
        const actual = effectivePort(url)
        if (
            wanted !== '*' &&
            actual !== wanted &&
            !(wanted === '80' && actual === '443')
        )
            return false
        if (!pathPrefix) return true
        return pathPrefix.endsWith('/')
            ? url.pathname.startsWith(pathPrefix)
            : url.pathname === pathPrefix
    })
}

// HTML's srcset parsing: a URL is a whitespace-free run (data: URLs keep
// their commas), and a trailing comma ends the candidate.
function srcsetUrls(srcset) {
    const urls = []
    let rest = srcset
    while (true) {
        rest = rest.replace(/^[\s,]+/, '')
        if (!rest) return urls
        const [token] = rest.match(/^\S+/)
        rest = rest.slice(token.length)
        const url = token.replace(/,+$/, '')
        if (url) urls.push(url)
        if (url === token) rest = rest.replace(/^[^,]*/, '')
    }
}

// Per the HTML spec, any other type is a data block (e.g. JSON-LD) that never
// executes, so script-src doesn't apply to it.
const javascriptTypes =
    /^(?:|module|importmap|speculationrules|(?:application|text)\/(?:x-)?(?:java|ecma)script|text\/javascript1\.[0-5]|text\/(?:jscript|livescript))$/

function inlineDigest(body, algorithm = 'sha256') {
    // The parser normalizes newlines before the browser hashes the text.
    return crypto
        .createHash(algorithm.toLowerCase())
        .update(body.replace(/\r\n?/g, '\n'), 'utf8')
        .digest('base64')
}

function excerpt(text) {
    const flat = text.replace(/\s+/g, ' ').trim()
    return flat.length > 60 ? `${flat.slice(0, 60)}...` : flat
}

const header = {
    script: effectiveSources(headerPolicy, 'script-src-elem', 'script-src'),
    style: effectiveSources(headerPolicy, 'style-src-elem', 'style-src'),
}
const headerUrlDirectives = {
    img: effectiveSources(headerPolicy, 'img-src'),
    media: effectiveSources(headerPolicy, 'media-src'),
}
const upgradesInsecure =
    sourceList(headerPolicy, 'upgrade-insecure-requests') !== null
// Which attributes load what, by element. <picture> sources take srcset
// (img-src); <video>/<audio> sources take src (media-src).
const urlAttributes = {
    img: { src: 'img', srcset: 'img' },
    source: { src: 'media', srcset: 'img' },
    video: { src: 'media', poster: 'img' },
    audio: { src: 'media' },
    image: { href: 'img', 'xlink:href': 'img' },
    input: { src: 'img' },
}
// Inline elements' verdicts per page are identical, so decide each once.
const headerVerdicts = new Map()

const problems = []
const pages = []
// "<kind> <hash>" -> the element and every page it appears on.
const inlineElements = new Map()
// Same shape, for inline elements netlify.toml's header CSP blocks.
const headerBlocked = new Map()
// "<directive> <url>" -> the URL and every page it appears on.
const blockedUrls = new Map()

function record(map, key, entry, page) {
    if (!map.has(key)) map.set(key, { ...entry, foundOn: [] })
    const { foundOn } = map.get(key)
    if (!foundOn.includes(page)) foundOn.push(page)
}

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

    // The header governs every inline element; the meta CSP only what's
    // parsed after it, so BaseLayout's earlier dark-mode script is header-only.
    const metaEnd = meta.index + meta[0].length
    for (const match of html.matchAll(tokenPattern)) {
        const [, name, attrSource, body] = match
        if (!name) continue
        const kind = name.toLowerCase()
        const attrs = parseAttrs(attrSource)
        if (kind === 'script') {
            if (attrs.has('src')) continue
            const type = (attrs.get('type') ?? '').trim().toLowerCase()
            if (!javascriptTypes.test(type)) continue
        }
        const hash = `sha256-${inlineDigest(body)}`
        const key = `${kind} ${hash}`
        const entry = {
            kind,
            hash,
            label: `<${name}${attrSource}> "${excerpt(body)}"`,
        }
        if (!headerVerdicts.has(key)) {
            headerVerdicts.set(
                key,
                !!header[kind] &&
                    allowsInline(header[kind].sources, kind, body),
            )
        }
        if (!headerVerdicts.get(key)) record(headerBlocked, key, entry, page)
        if (match.index >= metaEnd) record(inlineElements, key, entry, page)
    }

    // Hashes can't cover style="" attributes (that needs 'unsafe-hashes').
    const markup = html.replace(tokenPattern, (_, name, attrSource) =>
        name ? `<${name}${attrSource}></${name}>` : '',
    )
    const tags = [...markup.matchAll(tagPattern)]
    const styled = tags.filter(([, attrSource]) =>
        parseAttrs(attrSource).has('style'),
    )
    if (styled.length > 0) {
        problems.push(
            `${page}: ${styled.length} style attribute(s), first on ${excerpt(styled[0][0])}`,
        )
    }

    const pageUrl = new URL(`/${page.split(path.sep).join('/')}`, siteOrigin)
    for (const [tag, attrSource] of tags) {
        const name = tag.match(/^<([a-zA-Z]+)/)?.[1].toLowerCase()
        const loaders = urlAttributes[name]
        if (!loaders) continue
        const attrs = parseAttrs(attrSource)
        if (name === 'input' && attrs.get('type')?.toLowerCase() !== 'image')
            continue
        for (const [attr, kindOfUrl] of Object.entries(loaders)) {
            if (!attrs.has(attr)) continue
            const value = decodeEntities(attrs.get(attr))
            const raws = attr === 'srcset' ? srcsetUrls(value) : [value.trim()]
            const { directive, sources } = headerUrlDirectives[kindOfUrl] ?? {}
            for (const raw of raws) {
                let url
                try {
                    url = new URL(raw, pageUrl)
                    if (upgradesInsecure && url.protocol === 'http:')
                        url.protocol = 'https:'
                } catch {
                    url = null
                }
                if (url && sources && allowsUrl(sources, url)) continue
                record(
                    blockedUrls,
                    `${directive} ${raw}`,
                    { directive, raw },
                    page,
                )
            }
        }
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

for (const { kind, label, foundOn } of headerBlocked.values()) {
    const effective = header[kind]
    const disablers =
        kind === 'script'
            ? "a hash, nonce or 'strict-dynamic'"
            : 'a hash or nonce'
    const reason = !effective
        ? `netlify.toml's header CSP has no ${kind}-src or default-src`
        : disablesUnsafeInline(effective.sources, kind)
          ? `netlify.toml's header ${effective.directive} lists ${disablers}, which disables its 'unsafe-inline' (remove it)`
          : `netlify.toml's header ${effective.directive} has no 'unsafe-inline' or matching hash`
    problems.push(`${label} on ${where(foundOn)} is blocked: ${reason}`)
}

for (const { directive, raw, foundOn } of blockedUrls.values()) {
    problems.push(
        `${raw} on ${where(foundOn)} is blocked by netlify.toml's header ${directive ?? 'img-src/default-src (missing)'}: download the file next to the content that uses it, or widen ${directive ?? 'img-src'} in netlify.toml deliberately`,
    )
}

if (inlineElements.size === 0) {
    console.error(
        'No inline scripts or styles after the CSP <meta> in dist/. Is the build output complete?',
    )
    process.exit(1)
}

if (problems.length > 0) {
    console.error(
        "Built HTML the meta CSP (security.csp in astro.config.mjs) or netlify.toml's CSP header will block:",
    )
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

console.log(
    `CSP check passed (${htmlFiles.length} pages, ${inlineElements.size} distinct inline scripts/styles after the meta CSP, all inline code and image/media URLs allowed by netlify.toml's header, no style attributes).`,
)
