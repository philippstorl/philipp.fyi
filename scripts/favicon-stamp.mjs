import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Hashes of the favicon source and its rasters as of the last generate:favicons
// run, in `shasum -a 256` format, so CI can spot a stale raster without macOS.
export const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
)
export const stampPath = path.join(root, 'scripts', 'favicons.sha256')
export const stampedFiles = [
    'public/favicon.svg',
    'public/favicon.ico',
    'public/apple-touch-icon.png',
]

// `contents` lets the generator hash the exact bytes it rendered from.
export async function computeStamp(contents = {}) {
    const lines = await Promise.all(
        stampedFiles.map(async (file) => {
            let data = contents[file]
            if (!data) {
                try {
                    data = await fs.readFile(path.join(root, file))
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error
                    return `missing  ${file}\n`
                }
            }
            const hash = createHash('sha256').update(data).digest('hex')
            return `${hash}  ${file}\n`
        }),
    )
    return lines.join('')
}
