import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { computeStamp, root, stampPath } from './favicon-stamp.mjs'

// Rasterizes public/favicon.svg into the PNG/ICO fallbacks; rerun after editing it.
// librsvg uses this machine's fonts, and only macOS has the SVG's Helvetica Neue.
if (process.platform !== 'darwin') {
    throw new Error('Run on macOS: other platforms lack Helvetica Neue')
}

const publicDir = path.join(root, 'public')
const svg = await fs.readFile(path.join(publicDir, 'favicon.svg'))
const source = svg.toString()

const viewBoxWidth = Number(source.match(/viewBox="0 0 (\d+) \d+"/)?.[1])
const tileFill = source.match(/<rect[^>]*\sfill="(#[0-9A-Fa-f]{6})"/)?.[1]
if (!viewBoxWidth || !tileFill) {
    throw new Error('favicon.svg no longer has the expected viewBox/rect fill')
}

// Density sized so librsvg renders natively at the target size, not resampled.
function render(input, size) {
    return sharp(input, { density: (72 * size) / viewBoxWidth }).resize(
        size,
        size,
    )
}

// iOS applies its own corner mask, so the touch icon is a full-bleed square:
// flattening the rounded tile instead leaves a faint arc of anti-aliased pixels.
const squareSource = source.replace(/<rect[^>]*>/, (rect) =>
    rect.replace(/\s+r[xy]=(["'])[^"']*\1/g, ''),
)
if (squareSource === source) {
    throw new Error('favicon.svg rect no longer has an rx/ry to strip')
}
await render(Buffer.from(squareSource), 180)
    // Drops the alpha channel; iOS renders any transparency as black.
    .flatten({ background: tileFill })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

// PNG-in-ICO: a 6-byte header, one 16-byte directory entry per image, then the PNGs.
const images = await Promise.all(
    [16, 32, 48].map(async (size) => ({
        size,
        png: await render(svg, size).png().toBuffer(),
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

await fs.writeFile(stampPath, await computeStamp({ 'public/favicon.svg': svg }))

console.log(
    'Wrote public/apple-touch-icon.png, public/favicon.ico and scripts/favicons.sha256',
)
