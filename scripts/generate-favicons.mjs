import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// Rasterizes public/favicon.svg into the PNG/ICO fallbacks so they can't drift
// from it. Text renders with this machine's fonts: run it on macOS (Helvetica Neue).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const svg = await fs.readFile(path.join(publicDir, 'favicon.svg'))
const source = svg.toString()

const viewBoxWidth = Number(source.match(/viewBox="0 0 (\d+) \d+"/)?.[1])
const tileFill = source.match(/<rect[^>]*\sfill="(#[0-9A-Fa-f]{6})"/)?.[1]
if (!viewBoxWidth || !tileFill) {
    throw new Error('favicon.svg no longer has the expected viewBox/rect fill')
}

// Density sized so librsvg renders natively at the target size, not resampled.
function render(size) {
    return sharp(svg, { density: (72 * size) / viewBoxWidth }).resize(
        size,
        size,
    )
}

// iOS masks its own rounded corners and turns transparency black, so the
// touch icon fills the SVG's transparent corners with the tile color.
await render(180)
    .flatten({ background: tileFill })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

// PNG-in-ICO: a 6-byte header, one 16-byte directory entry per image, then the PNGs.
const images = await Promise.all(
    [16, 32, 48].map(async (size) => ({
        size,
        png: await render(size).png().toBuffer(),
    })),
)
const header = Buffer.alloc(6)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)
let offset = header.length + 16 * images.length
const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0)
    entry.writeUInt8(size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
})
await fs.writeFile(
    path.join(publicDir, 'favicon.ico'),
    Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]),
)

console.log('Wrote public/apple-touch-icon.png and public/favicon.ico')
