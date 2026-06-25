import satori from 'satori'
import sharp from 'sharp'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Font loading ─────────────────────────────────────────────
// Fonts are read from node_modules at build time.
// readdirSync lets us find the correct filename without hardcoding it.

type FontCache = { fraunces: ArrayBuffer; dmSans: ArrayBuffer } | null
let fontCache: FontCache = null

function nodeBufferToArrayBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer
}

function findFontFile(dir: string, matcher: (name: string) => boolean): string {
    const files = readdirSync(dir)
    const match = files.find(matcher)
    if (!match)
        throw new Error(
            `Font file not found in ${dir}. Files: ${files.join(', ')}`,
        )
    return resolve(dir, match)
}

function loadFonts(): NonNullable<FontCache> {
    if (fontCache) return fontCache

    // Satori supports TTF, OTF, and WOFF — but NOT WOFF2.
    // @fontsource-variable/fraunces only ships WOFF2 (fine for browsers),
    // so we use @fontsource/fraunces (non-variable, 400 weight) for OG images.
    const frauncesDir = resolve('./node_modules/@fontsource/fraunces/files')
    const dmSansDir = resolve('./node_modules/@fontsource/dm-sans/files')

    // Match WOFF files — both packages ship latin-400-normal.woff alongside .woff2
    const frauncesPath = findFontFile(
        frauncesDir,
        (f) =>
            f.includes('latin-400-normal') &&
            f.endsWith('.woff') &&
            !f.endsWith('.woff2'),
    )
    const dmSansPath = findFontFile(
        dmSansDir,
        (f) =>
            f.includes('latin-400-normal') &&
            f.endsWith('.woff') &&
            !f.endsWith('.woff2'),
    )

    fontCache = {
        fraunces: nodeBufferToArrayBuffer(readFileSync(frauncesPath)),
        dmSans: nodeBufferToArrayBuffer(readFileSync(dmSansPath)),
    }
    return fontCache
}

// ─── Design tokens ────────────────────────────────────────────
// Kept in sync with global.css OKLCH values (approximated as hex for Satori)
const colors = {
    background: '#FAF9F6',
    foreground: '#0D0D0C',
    muted: '#6B6865',
    accent: '#C85A2A',
    border: '#E4E0DA',
}

const OG_WIDTH = 1200
const OG_HEIGHT = 630

// ─── Template ─────────────────────────────────────────────────
// Satori does not accept JSX in a .ts file — the template is
// written using plain nested objects (equivalent to h() calls).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTemplate(title: string, label?: string): any {
    // Scale title font size to avoid overflow on longer strings
    const titleSize = title.length < 45 ? 72 : title.length < 75 ? 58 : 46

    const labelNode = label
        ? {
              type: 'div',
              props: {
                  style: {
                      fontSize: 20,
                      fontFamily: 'DM Sans',
                      color: colors.accent,
                      marginBottom: '20px',
                      letterSpacing: '-0.01em',
                  },
                  children: label,
              },
          }
        : { type: 'div', props: { style: { height: '40px' } } }

    return {
        type: 'div',
        props: {
            style: {
                width: '100%',
                height: '100%',
                display: 'flex',
                backgroundColor: colors.background,
                position: 'relative',
            },
            children: [
                // Left accent bar
                {
                    type: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 10,
                            backgroundColor: colors.accent,
                        },
                    },
                },
                // Main content
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            padding: '64px 80px',
                        },
                        children: [
                            // Category / page label
                            labelNode,
                            // Title — grows to fill available space
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        fontSize: titleSize,
                                        fontFamily: 'Fraunces',
                                        fontWeight: 400,
                                        color: colors.foreground,
                                        lineHeight: 1.05,
                                        letterSpacing: '-0.02em',
                                    },
                                    children: title,
                                },
                            },
                            // Footer
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderTop: `1px solid ${colors.border}`,
                                        paddingTop: '28px',
                                        marginTop: '28px',
                                        fontSize: 18,
                                        fontFamily: 'DM Sans',
                                        color: colors.muted,
                                    },
                                    children: 'Philipp Storl  ·  philipp.fyi',
                                },
                            },
                        ],
                    },
                },
            ],
        },
    }
}

// ─── Public API ───────────────────────────────────────────────

export async function generateOgImage(
    title: string,
    label?: string,
): Promise<Response> {
    const fonts = loadFonts()

    const svg = await satori(buildTemplate(title, label), {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: [
            {
                name: 'Fraunces',
                data: fonts.fraunces,
                weight: 400,
                style: 'normal',
            },
            {
                name: 'DM Sans',
                data: fonts.dmSans,
                weight: 400,
                style: 'normal',
            },
        ],
    })

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    return new Response(new Uint8Array(png), {
        headers: { 'Content-Type': 'image/png' },
    })
}
