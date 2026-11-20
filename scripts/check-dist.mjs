import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { load } from 'js-yaml'
import sharp from 'sharp'
import { recommendations } from '../src/data/recommendations.ts'

// Built-output checks that no other gate sees: an em dash in site copy, a
// case-study OG card that lost its cover panel (the route only warns), and a
// class with no CSS rule (Tailwind silently drops a mistyped utility).
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

const EM_DASH = String.fromCodePoint(0x2014)

function decodeEntities(text) {
    const named = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        mdash: EM_DASH,
    }
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (/^#x/i.test(e))
            return String.fromCodePoint(parseInt(e.slice(2), 16))
        if (e[0] === '#') return String.fromCodePoint(parseInt(e.slice(1), 10))
        return named[e.toLowerCase()] ?? m
    })
}

// Quote-aware, so a > inside an attribute value doesn't end the tag.
const attrsSource = String.raw`((?:[^>"']|"[^"]*"|'[^']*')*)`
const nodePattern = new RegExp(
    `<([a-zA-Z][\\w:-]*)${attrsSource}>|<[^>]*>|[^<]+`,
    'g',
)
const attrPattern =
    /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

// Start tags (with decoded attributes) and decoded text nodes, outside
// comments and <script>/<style> content.
function parse(html) {
    const tags = []
    const texts = []
    const markup = html.replace(
        /<!--[\s\S]*?-->|<(script|style)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi,
        '',
    )
    for (const [node, tagName, attrSource] of markup.matchAll(nodePattern)) {
        if (tagName) {
            const attrs = new Map()
            for (const [, name, ...values] of (attrSource ?? '').matchAll(
                attrPattern,
            )) {
                const value = values.find((v) => v != null) ?? ''
                attrs.set(name.toLowerCase(), decodeEntities(value))
            }
            tags.push({ name: tagName.toLowerCase(), attrs })
        } else if (!node.startsWith('<')) {
            texts.push(decodeEntities(node))
        }
    }
    return { tags, texts }
}

const htmlFiles = files.filter((f) => f.endsWith('.html'))
if (htmlFiles.length === 0) {
    console.error('No HTML pages found in dist/. Is the build output complete?')
    process.exit(1)
}
const pages = await Promise.all(
    htmlFiles.map(async (file) => {
        const html = await fs.readFile(file, 'utf8')
        return { name: path.relative(dist, file), html, ...parse(html) }
    }),
)
// A Set, so a dash repeated in a page's meta tags is reported once.
const problems = { emDash: new Set(), ogCover: [], classes: [] }

// Em dashes (CLAUDE.md bans them in site copy). Checking dist/ skips code
// comments, which the rule exempts. Allowed: verbatim recommendations.ts
// quotes, and a citation dash before a name right after a blockquote.
const normalize = (text) => text.replace(/\s+/g, ' ').trim()
const quotes = recommendations.flatMap((r) => r.quote.map(normalize))
// A short fragment (a lone dash) isn't evidence that it's quoted text.
const allowedDash = (text) =>
    normalize(text).length >= 20 &&
    quotes.some((quote) => quote.includes(normalize(text)))
const attribution = new RegExp(
    `(</blockquote>\\s*<p>)${EM_DASH}\\s[^<${EM_DASH}]+(</p>)`,
    'g',
)
for (const page of pages) {
    const { tags, texts } = parse(page.html.replace(attribution, '$1$2'))
    const values = [...texts, ...tags.flatMap((tag) => [...tag.attrs.values()])]
    for (const value of values) {
        if (!value.includes(EM_DASH) || allowedDash(value)) continue
        const at = value.indexOf(EM_DASH)
        const snippet = normalize(value.slice(Math.max(0, at - 40), at + 40))
        problems.emDash.add(`${page.name}: "${snippet}"`)
    }
}

// Case-study OG cards: a card with its cover panel has well over 1,000
// distinct colors in its right half (every 4th pixel); text-only ones under 100.
const MIN_PANEL_COLORS = 200
const workDir = path.join(root, 'src', 'content', 'work')
const coverBySlug = new Map()
for (const file of await fs.readdir(workDir)) {
    if (!/\.mdx?$/.test(file)) continue
    const raw = await fs.readFile(path.join(workDir, file), 'utf8')
    const data = load(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '')
    const slug = data?.slug ?? file.replace(/\.mdx?$/, '').toLowerCase()
    coverBySlug.set(slug, Boolean(data?.coverImage))
}
const ogCards = files.filter((f) =>
    /^og\/work\/[^/]+\.png$/.test(
        path.relative(dist, f).split(path.sep).join('/'),
    ),
)
let cardsWithCover = 0
for (const card of ogCards) {
    const slug = path.basename(card, '.png')
    if (!coverBySlug.has(slug)) {
        problems.ogCover.push(
            `og/work/${slug}.png: no src/content/work/ entry with this slug`,
        )
        continue
    }
    if (!coverBySlug.get(slug)) continue
    cardsWithCover++
    const { data, info } = await sharp(card)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
    const colors = new Set()
    for (let y = 0; y < info.height; y += 4) {
        for (let x = Math.floor(info.width / 2); x < info.width; x += 4) {
            const i = (y * info.width + x) * info.channels
            colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
        }
    }
    if (colors.size <= MIN_PANEL_COLORS) {
        problems.ogCover.push(
            `og/work/${slug}.png: ${colors.size} colors in the right half, expected > ${MIN_PANEL_COLORS} (cover panel missing? see the [og-image] build warnings)`,
        )
    }
}
if (cardsWithCover === 0) {
    problems.ogCover.push(
        'no built case-study OG card has a source entry with a coverImage (renamed field? update this check)',
    )
}

// Classes without a CSS rule in the stylesheets the page itself loads. Marker
// classes (group, peer, prose) appear inside :where(...), so they resolve.
// Only static markup is seen: a class a script adds isn't checked.
// Highlighter output counts as generated: `language-*` hints anywhere, and
// every class on or inside <pre>/<code> (Shiki's, Prism's token classes).
const allowedClass = (token) =>
    token === 'lucide' ||
    token.startsWith('lucide-') ||
    token.startsWith('language-')
// Comments and <script>/<style> alternate first, so their content is
// consumed whole and a <pre> inside one can't start a match.
const withoutCodeElements = (html) =>
    html.replace(
        /<!--[\s\S]*?-->|<(script|style)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<(pre|code)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\2\s*>/gi,
        '',
    )
const unescapeCss = (s) =>
    s.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_, hex, ch) =>
        hex ? String.fromCodePoint(parseInt(hex, 16)) : ch,
    )
function classSelectors(css) {
    const names = css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .matchAll(/\.((?:\\[0-9a-fA-F]{1,6}\s?|\\[^\n]|[\w-]|[^\x00-\x7f])+)/g)
    return [...names].map(([, name]) => unescapeCss(name))
}
const stylesheetSelectors = new Map()
async function selectorsOf(href) {
    if (!stylesheetSelectors.has(href)) {
        const file = path.join(dist, new URL(href, 'https://x/').pathname)
        const css = await fs.readFile(file, 'utf8').catch(() => '')
        stylesheetSelectors.set(href, classSelectors(css))
    }
    return stylesheetSelectors.get(href)
}
const unmatched = new Map()
const classTokens = new Set()
for (const page of pages) {
    const selectors = new Set()
    for (const tag of page.tags) {
        const rel = tag.attrs.get('rel')?.toLowerCase().split(/\s+/) ?? []
        if (tag.name === 'link' && rel.includes('stylesheet')) {
            const href = tag.attrs.get('href')
            for (const s of href ? await selectorsOf(href) : []) {
                selectors.add(s)
            }
        }
    }
    for (const [, css] of page.html.matchAll(
        /<style(?=[\s>])[^>]*>([\s\S]*?)<\/style\s*>/gi,
    )) {
        for (const s of classSelectors(css)) selectors.add(s)
    }
    for (const tag of parse(withoutCodeElements(page.html)).tags) {
        for (const token of (tag.attrs.get('class') ?? '').split(/\s+/)) {
            if (!token) continue
            classTokens.add(token)
            if (selectors.has(token) || allowedClass(token)) continue
            const seen = unmatched.get(token) ?? new Set()
            seen.add(page.name)
            unmatched.set(token, seen)
        }
    }
}
for (const [token, seen] of unmatched) {
    problems.classes.push(
        `${token} (${seen.size} page${seen.size === 1 ? '' : 's'}, e.g. ${[...seen][0]})`,
    )
}

const headings = {
    emDash: 'Em dashes in site copy (reword, or see the exceptions in CLAUDE.md):',
    ogCover: 'Case-study OG cards without their cover panel:',
    classes:
        'Classes with no rule in the CSS their page loads (typo, or an unknown Tailwind utility/variant?):',
}
let failed = false
for (const [key, list] of Object.entries(problems)) {
    if ([...list].length === 0) continue
    failed = true
    console.error(headings[key])
    for (const problem of list) console.error(`  ${problem}`)
}
if (failed) {
    console.error(
        '(Checks dist/ as last built; rebuild first if it may be stale.)',
    )
    process.exit(1)
}

console.log(
    `Dist check passed (${pages.length} pages: no em dash outside the allowed quotes, ${cardsWithCover} OG cover panels, all ${classTokens.size} classes have a rule).`,
)
