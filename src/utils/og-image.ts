import satori from 'satori'
import sharp from 'sharp'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { CATEGORY_HEX_COLORS, type WorkCategory } from '@/utils/category-colors'

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

// Size of the inset screenshot panel when a case study has a coverImage.
// Same 16:10 aspect ratio as the home page's WorkCard cover — a 1:1 crop
// of a full-page screenshot looked broken rather than like a real preview.
const COVER_PANEL_WIDTH = 480
const COVER_PANEL_HEIGHT = 300

async function buildCoverImageDataUri(coverImagePath: string): Promise<string> {
    // Crop from the top, same reasoning as WorkCard.astro's cover image: a
    // full-page screenshot's nav/hero is the most recognizable part, and the
    // panel is taller than it is wide, so a center crop would lose it.
    const cropped = await sharp(coverImagePath)
        .resize(COVER_PANEL_WIDTH, COVER_PANEL_HEIGHT, {
            fit: 'cover',
            position: 'top',
        })
        .png()
        .toBuffer()
    return `data:image/png;base64,${cropped.toString('base64')}`
}

// Satori does not accept JSX in a .ts file — the template is
// written using plain nested objects (equivalent to h() calls).

// Shared by both label node variants below.
const labelBaseStyle = {
    fontSize: 20,
    fontFamily: 'DM Sans',
    marginBottom: '20px',
    letterSpacing: '-0.01em',
}

// A case study's category renders as the same pill badge used by
// WorkCard.astro/CategoryBadge.astro (see category-colors.ts) — borderRadius
// 9999 and the 6px/16px padding are Satori's equivalent of that component's
// `rounded-full` and `px-2.5 py-0.5` Tailwind classes, scaled up for
// OG-image poster legibility.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCategoryBadgeNode(category: WorkCategory): any {
    const { text, border } = CATEGORY_HEX_COLORS[category]
    return {
        type: 'div',
        props: {
            style: {
                ...labelBaseStyle,
                display: 'flex',
                alignItems: 'center',
                // Parent column defaults to align-items: stretch — without
                // this the bordered pill would stretch full-width.
                alignSelf: 'flex-start',
                fontWeight: 500,
                color: text,
                border: `1px solid ${border}`,
                borderRadius: 9999,
                padding: '6px 16px',
            },
            children: category,
        },
    }
}

// Plain-text top label used by non-category OG images (home/principles).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPlainLabelNode(label: string): any {
    return {
        type: 'div',
        props: {
            style: { ...labelBaseStyle, color: colors.accent },
            children: label,
        },
    }
}

function buildTemplate(
    title: string,
    label?: string,
    coverImageDataUri?: string,
    category?: WorkCategory,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
    // A cover image narrows the text column, so longer titles need a smaller
    // size sooner than the text-only layout does.
    const titleSize = coverImageDataUri
        ? title.length < 45
            ? 56
            : title.length < 75
              ? 44
              : 34
        : title.length < 45
          ? 72
          : title.length < 75
            ? 58
            : 46

    const labelNode = category
        ? buildCategoryBadgeNode(category)
        : label
          ? buildPlainLabelNode(label)
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
                            padding: coverImageDataUri
                                ? '64px 0 64px 80px'
                                : '64px 80px',
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
                // Cover image panel — only for case studies that have one.
                // Top-aligned with the same 64px offset as the text column's
                // padding, so the panel's top edge lines up with the
                // category label instead of floating at vertical center.
                coverImageDataUri && {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '64px 64px 0',
                        },
                        children: {
                            type: 'img',
                            props: {
                                src: coverImageDataUri,
                                width: COVER_PANEL_WIDTH,
                                height: COVER_PANEL_HEIGHT,
                                style: {
                                    borderRadius: 16,
                                    border: `1px solid ${colors.border}`,
                                    boxShadow:
                                        '0 20px 40px rgba(13, 13, 12, 0.18)',
                                },
                            },
                        },
                    },
                },
            ].filter(Boolean),
        },
    }
}

export async function generateOgImage(
    title: string,
    label?: string,
    coverImagePath?: string,
    category?: WorkCategory,
): Promise<Response> {
    const fonts = loadFonts()
    const coverImageDataUri = coverImagePath
        ? await buildCoverImageDataUri(coverImagePath)
        : undefined

    const svg = await satori(
        buildTemplate(title, label, coverImageDataUri, category),
        {
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
        },
    )

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    return new Response(new Uint8Array(png), {
        headers: { 'Content-Type': 'image/png' },
    })
}
