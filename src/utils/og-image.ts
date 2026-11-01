import satori, { type Font } from 'satori'
import sharp from 'sharp'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactNode } from 'react'
import { SITE_NAME } from '@/data/site'
import { CATEGORY_HEX_COLORS, type WorkCategory } from '@/utils/category-colors'

// Satori's JSX-equivalent input tree (no JSX in this file). Not `SatoriNode`
// -- Satori already uses that name for its rendered *output* shape.
interface SatoriTemplateNode {
    type: string
    props: Record<string, unknown>
}

let fontCache: Font[] | null = null

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

function loadFonts(): Font[] {
    if (fontCache) return fontCache

    // Satori can't read WOFF2; the variable font package only ships WOFF2,
    // so the static weights come from the non-variable @fontsource/geist.
    const geistDir = resolve('./node_modules/@fontsource/geist/files')
    const readWoff = (subset: string): ArrayBuffer =>
        nodeBufferToArrayBuffer(
            readFileSync(
                findFontFile(
                    geistDir,
                    (f) =>
                        f.includes(`-${subset}-normal`) && f.endsWith('.woff'),
                ),
            ),
        )

    fontCache = [
        {
            name: 'Geist',
            data: readWoff('latin-400'),
            weight: 400,
            style: 'normal',
        },
        {
            name: 'Geist',
            data: readWoff('latin-700'),
            weight: 700,
            style: 'normal',
        },
        // Per-glyph fallback for Ł, ř, ş, ő... Satori keeps only the first font
        // per name and weight, so latin-ext needs its own family name.
        {
            name: 'Geist Latin Ext',
            data: readWoff('latin-ext-400'),
            weight: 400,
            style: 'normal',
        },
        {
            name: 'Geist Latin Ext',
            data: readWoff('latin-ext-700'),
            weight: 700,
            style: 'normal',
        },
    ]
    return fontCache
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
    granularity: 'grapheme',
})

// "👍🏽 (U+1F44D U+1F3FD)": code points make invisible/combining marks findable.
function describeGrapheme(grapheme: string): string {
    const codePoints = Array.from(
        grapheme,
        // Array.from(string) only yields non-empty code points.
        (cp) =>
            `U+${cp.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`,
    )
    return `${grapheme} (${codePoints.join(' ')})`
}

// Hex copies of global.css's light tokens (Satori can't read CSS variables);
// `npm run check:color-copies` fails if they drift.
const colors = {
    background: '#FAF8F5',
    foreground: '#070604',
    muted: '#55524E',
    accent: '#7E2C86',
    border: '#DDDAD6',
}

// Footer domain, from astro.config.mjs's `site`.
const SITE_HOST = new URL(import.meta.env.SITE).host

const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Same 16:10 ratio as WorkCard's cover -- a 1:1 crop looked broken.
const COVER_PANEL_WIDTH = 480
const COVER_PANEL_HEIGHT = 300

async function buildCoverImageDataUri(coverImagePath: string): Promise<string> {
    // Top crop -- nav/hero is the recognizable part of a full-page screenshot.
    const cropped = await sharp(coverImagePath)
        .resize(COVER_PANEL_WIDTH, COVER_PANEL_HEIGHT, {
            fit: 'cover',
            position: 'top',
        })
        .png()
        .toBuffer()
    return `data:image/png;base64,${cropped.toString('base64')}`
}

const labelBaseStyle = {
    fontSize: 20,
    fontFamily: 'Geist',
    marginBottom: '20px',
    letterSpacing: '-0.01em',
}

// Mirrors WorkCard/CategoryBadge's pill -- borderRadius 9999 + 6px/16px
// padding are rounded-full/px-2.5 py-0.5, scaled up for OG size.
function buildCategoryBadgeNode(category: WorkCategory): SatoriTemplateNode {
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

// Plain-text top label used when there's no category badge.
function buildPlainLabelNode(label: string): SatoriTemplateNode {
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
): SatoriTemplateNode {
    // Cover image narrows the column -- shrink titles sooner than text-only.
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
                                        fontFamily: 'Geist',
                                        fontWeight: 700,
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
                                        fontFamily: 'Geist',
                                        color: colors.muted,
                                    },
                                    children: `${SITE_NAME}  ·  ${SITE_HOST}`,
                                },
                            },
                        ],
                    },
                },
                // Top-aligned at the text column's own 64px offset, level with the label.
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
    const coverImageDataUri = coverImagePath
        ? await buildCoverImageDataUri(coverImagePath)
        : undefined

    const missingGraphemes = new Set<string>()
    const svg = await satori(
        // satori() wants a real ReactNode; this file's plain {type,props}
        // objects work anyway -- Satori accepts the shape at runtime.
        buildTemplate(
            title,
            label,
            coverImageDataUri,
            category,
        ) as unknown as ReactNode,
        {
            width: OG_WIDTH,
            height: OG_HEIGHT,
            fonts: loadFonts(),
            // Satori calls this with the characters no loaded font covers
            // (arrows, check marks, emoji); none ship, so just record them.
            loadAdditionalAsset: async (_languageCode, segment) => {
                for (const { segment: grapheme } of graphemeSegmenter.segment(
                    segment,
                ))
                    missingGraphemes.add(grapheme)
                return []
            },
        },
    )

    // Covers the whole card (title, label, badge, footer), not just the title.
    if (missingGraphemes.size > 0) {
        console.warn(
            `[og-image] OG card for "${title}": no OG font has ${[...missingGraphemes].map(describeGrapheme).join(', ')}, so it draws them as empty boxes.`,
        )
    }

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    return new Response(new Uint8Array(png), {
        headers: { 'Content-Type': 'image/png' },
    })
}
