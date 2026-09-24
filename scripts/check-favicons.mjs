import fs from 'fs/promises'
import path from 'path'
import { computeStamp, root, stampPath } from './favicon-stamp.mjs'

// Fails when favicon.svg or its rasters changed since the last
// generate:favicons run. Hash-only, since re-rendering needs macOS fonts.
const stampFile = path.relative(root, stampPath)

let recorded = ''
try {
    recorded = await fs.readFile(stampPath, 'utf8')
} catch (error) {
    if (error.code !== 'ENOENT') throw error
}

// Line-by-line, so CRLF checkouts and a missing final newline still pass.
const recordedLines = new Set(recorded.replace(/\r/g, '').split('\n'))
const changed = (await computeStamp())
    .split('\n')
    .filter((line) => line && !recordedLines.has(line))
    .map((line) => line.split('  ')[1])

if (changed.length === 0) {
    console.log(
        'Favicon check passed (favicon.svg and its rasters unchanged since generate:favicons).',
    )
    process.exit(0)
}

console.error(
    recorded
        ? `Changed since the favicons were last generated: ${changed.join(', ')}`
        : `${stampFile} is missing.`,
)
console.error(
    `Run \`npm run generate:favicons\` on macOS, then commit public/favicon.ico, public/apple-touch-icon.png and ${stampFile}.`,
)
process.exit(1)
