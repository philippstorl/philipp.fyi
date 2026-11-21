import fs from 'fs/promises'
import path from 'path'

// A font preload the CSS can't reuse (href matching no built @font-face src,
// or no crossorigin) downloads the font twice. One for a face the text doesn't
// use first (italic, or a subset without basic Latin) wastes the early fetch,
// and every page must preload the upright Latin Geist. Runs against dist/.
const root = path.resolve(import.meta.dirname, '..')
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

// Lightning CSS writes U+0000-00FF as U+??, so expand ? to 0 (low) / F (high).
function coversCapitalA(unicodeRange) {
    if (!unicodeRange) return true
    return unicodeRange.split(',').some((part) => {
        const [low, high = low] = part.trim().replace(/^U\+/i, '').split('-')
        if (!low) return false
        const start = parseInt(low.replaceAll('?', '0'), 16)
        const end = parseInt(high.replaceAll('?', 'F'), 16)
        return start <= 0x41 && 0x41 <= end
    })
}

// Every @font-face src URL, mapped to the face it belongs to.
const faces = new Map()
for (const file of files.filter((f) => f.endsWith('.css'))) {
    const css = await fs.readFile(file, 'utf8')
    for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        const body = block[1] ?? ''
        const descriptor = (name) =>
            body
                .match(new RegExp(`(?:^|;)\\s*${name}\\s*:([^;]*)`))?.[1]
                ?.trim()
        const face = {
            family: descriptor('font-family')?.replace(/^["']|["']$/g, ''),
            italic: /italic|oblique/.test(descriptor('font-style') ?? ''),
            latin: coversCapitalA(descriptor('unicode-range')),
        }
        for (const match of (descriptor('src') ?? '').matchAll(
            /url\(\s*["']?([^"')\s]+)["']?\s*\)/g,
        )) {
            if (match[1]) faces.set(match[1], face)
        }
    }
}

const preloadPattern = /<link\b[^>]*\brel=["']?preload["']?[^>]*>/g
const problems = []
let preloadCount = 0

for (const file of files.filter((f) => f.endsWith('.html'))) {
    const html = await fs.readFile(file, 'utf8')
    const page = path.relative(dist, file)
    let preloadsGeist = false
    for (const tag of html.match(preloadPattern) ?? []) {
        if (!/\bas=["']?font["']?/.test(tag)) continue
        const href = tag.match(/\bhref=["']?([^"'\s>]+)/)?.[1]
        const face = href ? faces.get(href) : undefined
        preloadCount++
        if (!/\bcrossorigin\b/.test(tag)) {
            problems.push(`${page}: ${href} (no crossorigin)`)
        }
        if (!face) {
            problems.push(`${page}: ${href ?? '(no href)'} (no @font-face)`)
        } else if (face.italic || !face.latin) {
            const why = face.italic ? 'italic' : 'no basic Latin'
            problems.push(`${page}: ${href} (${why} face)`)
        } else if (face.family === 'Geist Variable') {
            preloadsGeist = true
        }
    }
    if (!preloadsGeist) {
        problems.push(`${page}: no preload of the upright Latin Geist file`)
    }
}

if (preloadCount === 0) {
    console.error(
        'No font preloads found in dist/. Is the build output complete?',
    )
    process.exit(1)
}

if (problems.length > 0) {
    console.error('Font preload problems:')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

console.log(
    `Font preload check passed (${preloadCount} preloads across the build).`,
)
