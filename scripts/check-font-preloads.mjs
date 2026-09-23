import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// A font preload the CSS can't reuse (href matching no built @font-face src,
// or no crossorigin) downloads the font twice. Runs against dist/.
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

const cssUrls = new Set()
for (const file of files.filter((f) => f.endsWith('.css'))) {
    const css = await fs.readFile(file, 'utf8')
    for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        const src = block[1]?.match(/src\s*:([^;}]*)/)?.[1] ?? ''
        for (const match of src.matchAll(
            /url\(\s*["']?([^"')\s]+)["']?\s*\)/g,
        )) {
            if (match[1]) cssUrls.add(match[1])
        }
    }
}

const preloadPattern = /<link\b[^>]*\brel=["']?preload["']?[^>]*>/g
const problems = []
let preloadCount = 0

for (const file of files.filter((f) => f.endsWith('.html'))) {
    const html = await fs.readFile(file, 'utf8')
    for (const tag of html.match(preloadPattern) ?? []) {
        if (!/\bas=["']?font["']?/.test(tag)) continue
        const href = tag.match(/\bhref=["']?([^"'\s>]+)/)?.[1]
        preloadCount++
        if (!/\bcrossorigin\b/.test(tag)) {
            problems.push(
                `${path.relative(dist, file)}: ${href} (no crossorigin)`,
            )
        } else if (!href || !cssUrls.has(href)) {
            problems.push(
                `${path.relative(dist, file)}: ${href ?? '(no href)'}`,
            )
        }
    }
}

if (preloadCount === 0) {
    console.error(
        'No font preloads found in dist/. Is the build output complete?',
    )
    process.exit(1)
}

if (problems.length > 0) {
    console.error('Font preloads the built CSS will not reuse:')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

console.log(
    `Font preload check passed (${preloadCount} preloads across the build).`,
)
