import fs from 'fs/promises'
import path from 'path'
import { computeStamp, root, stampPath } from './favicon-stamp.mjs'

// Fails when favicon.svg or its rasters changed since the last
// generate:favicons run. Hash-only, since re-rendering needs macOS fonts.
const stampFile = path.relative(root, stampPath)

let recorded
try {
    recorded = await fs.readFile(stampPath, 'utf8')
} catch (error) {
    if (error.code !== 'ENOENT') throw error
    recorded = ''
}

const expected = await computeStamp()
if (recorded === expected) {
    console.log('Favicon check passed (rasters match favicon.svg).')
    process.exit(0)
}

const recordedLines = new Set(recorded.split('\n'))
const changed = expected
    .split('\n')
    .filter((line) => line && !recordedLines.has(line))
    .map((line) => line.split('  ')[1])

console.error(
    recorded
        ? `Changed since the favicons were last generated: ${changed.join(', ') || stampFile}`
        : `${stampFile} is missing.`,
)
console.error(
    `Run \`npm run generate:favicons\` on macOS, then commit public/favicon.ico, public/apple-touch-icon.png and ${stampFile}.`,
)
process.exit(1)
