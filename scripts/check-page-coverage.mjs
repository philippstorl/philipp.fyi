import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { pages } from './contrast-pages.mjs'

// contrast-pages.mjs is hand-typed, so a new page or published collection
// entry would silently skip the contrast and meta-description specs. Diffs
// it against the built HTML in dist/ in both directions. Also fails on a
// block element inside an open <p> (e.g. MDX wrapping a raw <p>'s line-broken
// text in its own <p>), which the browser splits into stray paragraphs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

// Built pages deliberately left out of contrast-pages.mjs. Empty today:
// /404, /privacy/ and (while empty) /blog/ are noindex but still scanned.
const excludedPaths = new Set()

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

// dist/work/foo/index.html -> /work/foo/; flat dist/404.html -> /404.
function toRoutePath(file) {
    const rel = path.relative(dist, file).split(path.sep).join('/')
    if (rel === 'index.html') return '/'
    if (rel.endsWith('/index.html'))
        return `/${rel.slice(0, -'index.html'.length)}`
    return `/${rel.slice(0, -'.html'.length)}`
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
const builtPaths = new Set(htmlFiles.map(toRoutePath))

// Start tags that implicitly close an open <p> (HTML spec, "in body" mode).
const pClosers =
    'address|article|aside|blockquote|center|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|li|listing|main|menu|nav|ol|p|plaintext|pre|search|section|summary|table|ul|xmp'
const attrsSource = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`
const blockInParagraph = new RegExp(
    `(<p(?=[\\s/>])${attrsSource}>)(?:(?!</p\\s*>)[\\s\\S])*?<(${pClosers})(?=[\\s/>])`,
    'gi',
)
const nestingProblems = []
for (const file of htmlFiles) {
    const html = (await fs.readFile(file, 'utf8')).replace(
        /<!--[\s\S]*?-->|<(script|style|template|textarea|svg)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*(?<!\/)>[\s\S]*?<\/\1\s*>/gi,
        '',
    )
    for (const [, openTag, tag] of html.matchAll(blockInParagraph)) {
        nestingProblems.push(
            `${toRoutePath(file)}: <${tag.toLowerCase()}> inside ${openTag}`,
        )
    }
}
const listedPaths = new Set(pages.map((p) => p.reportedPath))
const duplicates = pages
    .map((p) => p.reportedPath)
    .filter((p, i, all) => all.indexOf(p) !== i)
// Only /404 is scanned via another URL (same convention as e2e/404.spec.ts);
// any other mismatch would scan the 404 page under the listed name.
const mismatchedGoto = pages.filter(
    (p) => p.reportedPath !== '/404' && p.gotoPath !== p.reportedPath,
)

if (builtPaths.size === 0) {
    console.error('No HTML pages found in dist/. Is the build output complete?')
    process.exit(1)
}

const missing = [...builtPaths].filter(
    (p) => !listedPaths.has(p) && !excludedPaths.has(p),
)
const stale = [...listedPaths].filter((p) => !builtPaths.has(p))
const staleExclusions = [...excludedPaths].filter((p) => !builtPaths.has(p))

if (missing.length > 0) {
    console.error(
        'Built pages missing from scripts/contrast-pages.mjs (add them, or to excludedPaths with a reason):',
    )
    for (const p of missing.sort()) console.error(`  ${p}`)
}
if (stale.length > 0) {
    console.error(
        'Pages in scripts/contrast-pages.mjs with no built HTML (remove or rename them):',
    )
    for (const p of stale.sort()) console.error(`  ${p}`)
}
if (staleExclusions.length > 0) {
    console.error('excludedPaths entries with no built HTML:')
    for (const p of staleExclusions.sort()) console.error(`  ${p}`)
}
if (duplicates.length > 0) {
    console.error(
        'Duplicate reportedPath entries in scripts/contrast-pages.mjs:',
    )
    for (const p of duplicates) console.error(`  ${p}`)
}
if (mismatchedGoto.length > 0) {
    console.error('Entries whose gotoPath differs from reportedPath:')
    for (const p of mismatchedGoto) {
        console.error(`  ${p.reportedPath} -> ${p.gotoPath}`)
    }
}
if (nestingProblems.length > 0) {
    console.error('Block elements inside an open <p> (invalid HTML nesting):')
    for (const p of nestingProblems) console.error(`  ${p}`)
}
const problemCount =
    nestingProblems.length +
    missing.length +
    stale.length +
    staleExclusions.length +
    duplicates.length +
    mismatchedGoto.length
if (problemCount > 0) {
    console.error(
        '(Checks dist/ as last built; rebuild first if it may be stale.)',
    )
    process.exit(1)
}

console.log(
    `Page coverage check passed (${listedPaths.size} listed pages match the build, no block elements inside a <p>).`,
)
