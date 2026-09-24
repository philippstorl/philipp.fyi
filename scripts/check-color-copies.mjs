import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Satori, the standalone favicon and theme-color meta tags can't read CSS
// variables, so they hold hex copies of global.css's OKLCH tokens (#350).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFile(path.join(root, file), 'utf8')

const HEX = '#[0-9A-Fa-f]{6}'

// Every entry in og-image.ts's `colors` object is a copy of the light token
// with the same name (camelCase or kebab-case); the others are listed here.
const MARKUP_COPIES = [
    {
        file: 'public/favicon.svg',
        label: '<rect> fill',
        pattern: new RegExp(`<rect\\b[^>]*\\sfill="(${HEX})"`, 'g'),
        token: 'accent',
        theme: 'light',
    },
    {
        file: 'public/favicon.svg',
        label: '<text> fill',
        pattern: new RegExp(`<text\\b[^>]*\\sfill="(${HEX})"`, 'g'),
        token: 'background',
        theme: 'light',
    },
    ...['light', 'dark'].map((theme) => ({
        file: 'src/layouts/BaseLayout.astro',
        label: `${theme} theme-color <meta>`,
        pattern: new RegExp(
            `<meta\\s+name="theme-color"\\s+media="\\(prefers-color-scheme: ${theme}\\)"\\s+content="(${HEX})"`,
            'g',
        ),
        token: 'background',
        theme,
    })),
]

function parseTokens(css, blockPattern, name) {
    const body = css.match(blockPattern)?.[1]
    if (!body) throw new Error(`global.css: no ${name} block found`)
    const tokens = new Map()
    const tokenPattern =
        /--color-([\w-]+):\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g
    for (const [, token, l, c, h] of body.matchAll(tokenPattern)) {
        tokens.set(token, [Number(l) / 100, Number(c), Number(h)])
    }
    return tokens
}

// OKLCH -> linear sRGB via OKLab (Ottosson's matrices), then sRGB-encoded,
// as unrounded 0-255 channels.
function oklchToRgb([l, c, h]) {
    const a = c * Math.cos((h * Math.PI) / 180)
    const b = c * Math.sin((h * Math.PI) / 180)
    const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
    const linear = [
        4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
        -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
        -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
    ]
    return linear.map((x) => {
        const encoded =
            Math.abs(x) <= 0.0031308
                ? 12.92 * x
                : Math.sign(x) * (1.055 * Math.abs(x) ** (1 / 2.4) - 0.055)
        return encoded * 255
    })
}

const toHex = (rgb) =>
    `#${rgb
        .map((v) => Math.round(v).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}`

const lineOf = (text, index) => text.slice(0, index).split('\n').length

const css = await read('src/styles/global.css')
const tokensByTheme = {
    light: parseTokens(css, /^@theme\s*\{([\s\S]*?)^\}/m, '@theme'),
    dark: parseTokens(css, /^\.dark\s*\{([\s\S]*?)^\}/m, '.dark'),
}

const copies = []
const problems = []

const ogFile = 'src/utils/og-image.ts'
const ogSource = await read(ogFile)
const ogBlock = ogSource.match(/const colors = \{([\s\S]*?)^\}/m)
// Any `key: value` line, so an unexpected key or value shape fails loudly.
// Trailing `//` and `/* */` comments are dropped from the value.
const ogEntries = [
    ...(ogBlock?.[1] ?? '').matchAll(
        /^[ \t]*(['"]?)([\w-]+)\1[ \t]*:[ \t]*(.*?)[ \t]*,?(?:[ \t]*(?:\/\/.*|\/\*.*?\*\/))*[ \t]*$/gm,
    ),
]
if (ogEntries.length === 0) {
    problems.push(`${ogFile}: no \`const colors = { ... }\` entries found`)
} else {
    const bodyStart = ogBlock.index + ogBlock[0].indexOf('{') + 1
    for (const entry of ogEntries) {
        const [, , key, value] = entry
        copies.push({
            file: ogFile,
            line: lineOf(ogSource, bodyStart + entry.index),
            label: `colors.${key}`,
            actual: value.replace(/^(['"])(.*)\1$/, '$2'),
            token: key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
            theme: 'light',
        })
    }
}

for (const copy of MARKUP_COPIES) {
    const source = await read(copy.file)
    const matches = [...source.matchAll(copy.pattern)]
    if (matches.length !== 1) {
        problems.push(
            `${copy.file}: expected exactly one ${copy.label}, found ${matches.length}`,
        )
        continue
    }
    const [match] = matches
    copies.push({
        ...copy,
        line: lineOf(source, match.index),
        actual: match[1],
    })
}

for (const { file, line, label, actual, token, theme } of copies) {
    const where = `${file}:${line} ${label}`
    const oklch = tokensByTheme[theme].get(token)
    if (!oklch) {
        problems.push(`${where}: no --color-${token} oklch() token (${theme})`)
        continue
    }
    const exact = oklchToRgb(oklch)
    const source = `--color-${token}, ${theme}`
    if (exact.some((v) => v < -0.5 || v >= 255.5)) {
        problems.push(
            `${where}: ${source} is outside sRGB, so no hex copy can match it`,
        )
        continue
    }
    const expected = toHex(exact)
    if (!new RegExp(`^${HEX}$`).test(actual)) {
        problems.push(
            `${where}: expected ${expected} (${source}), found ${actual}`,
        )
        continue
    }
    const actualRgb = [1, 3, 5].map((i) => parseInt(actual.slice(i, i + 2), 16))
    // Within 1 per channel: allows either rounding of the exact value.
    if (actualRgb.some((v, i) => Math.abs(v - exact[i]) >= 1)) {
        problems.push(
            `${where}: expected ${expected} (${source}), found ${actual}`,
        )
    }
}

if (problems.length > 0) {
    console.error('Hex copies of global.css color tokens are out of sync:')
    for (const problem of problems) console.error(`  ${problem}`)
    console.error(
        'Update the copy to the expected hex, or the token if the copy is the intended value.',
    )
    process.exit(1)
}

console.log(
    `Color copy check passed (${copies.length} hex copies match their global.css tokens).`,
)
