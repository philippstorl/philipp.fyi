import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// An inline <script type="module"> makes ClientRouter inject a
// <script src="data:..."> barrier on soft navigation, which script-src
// (no data:) blocks. Runs against dist/.
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

// Mirrors runScripts()'s own test: type exactly "module", no src attribute.
// Quote-aware, so a `>` inside an attribute value doesn't end the tag early.
const scriptPattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi
const problems = []
let moduleCount = 0

for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8')
    for (const [tag, attrs = ''] of html.matchAll(scriptPattern)) {
        if (!/(?:^|\s)type\s*=\s*["']?module["'\s/>]/i.test(`${attrs}>`))
            continue
        moduleCount++
        if (!/(?:^|\s)src\s*=/i.test(attrs)) {
            problems.push(`${path.relative(dist, file)}: ${tag}`)
        }
    }
}

if (moduleCount === 0) {
    console.error(
        'No module scripts found in dist/. Is the build output complete?',
    )
    process.exit(1)
}

if (problems.length > 0) {
    console.error(
        'Inline module scripts (see vite.build.assetsInlineLimit in astro.config.mjs):',
    )
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

console.log(
    `Inline module script check passed (${moduleCount} module scripts, all external).`,
)
