import type { ImageMetadata } from 'astro'

// Sizing helpers for figures inside the case-study/blog prose column
// (CaseStudyLayout.astro's `mx-auto max-w-3xl px-6` container: 720px content
// width once the viewport itself reaches 768px — Tailwind's global
// box-sizing:border-box means max-w-3xl's 768px max-width already includes
// the px-6 padding, it isn't added on top of it). Below that breakpoint the
// container is fluid, so every figure here — even one inside a grid whose
// column count never changes — genuinely shrinks with the viewport. A
// `sizes` value that only ever states the desktop pixel width (as an
// earlier version of these case studies did) makes a device with a smaller
// real box fetch a larger srcset candidate than it needs, purely because
// pixel-density srcset (`densities`) has no way to know the box shrank.
// These helpers compute an accurate `sizes`/`widths` pair instead.

const CONTAINER_CAP_PX = 720
const CONTAINER_CAP_BREAKPOINT = 768
const CONTAINER_PADDING_PX = 48
const GRID_GAP_PX = 16

interface FigureSizing {
    width: number
    sizes: string
    widths: number[]
}

// 1x/2x/3x of `base`, clamped to the source's own native width so a small
// image is never upscaled. Falls back to the native width itself (Astro's
// own equivalent `widths` clamp does the same) rather than an empty array
// when even the 1x candidate exceeds it — an empty `widths` degrades to no
// srcset at all.
function widthLadder(base: number, nativeWidth: number): number[] {
    const candidates = [base, base * 2, base * 3].filter(
        (w) => w <= nativeWidth,
    )
    return candidates.length > 0 ? candidates : [nativeWidth]
}

function columnWidth(columns: number): number {
    return Math.round(
        (CONTAINER_CAP_PX - (columns - 1) * GRID_GAP_PX) / columns,
    )
}

function columnFluidExpr(columns: number): string {
    const gutter = CONTAINER_PADDING_PX + (columns - 1) * GRID_GAP_PX
    return columns === 1
        ? `calc(100vw - ${gutter}px)`
        : `calc((100vw - ${gutter}px) / ${columns})`
}

// Combining multiple tiers' own 1x/2x/3x ladders can land two candidates
// within a few percent of each other (e.g. 704px and 720px) — each still
// costs a full separate build-time encode for no real browser-selection
// benefit. Drops a candidate only when another survives within `threshold`
// of it, so this never removes a genuinely distinct tier's own size.
function mergeCloseWidths(widths: number[], threshold = 24): number[] {
    const sorted = [...widths].sort((a, b) => a - b)
    const merged: number[] = []
    for (const width of sorted) {
        if (
            merged.length === 0 ||
            width - merged[merged.length - 1] > threshold
        ) {
            merged.push(width)
        }
    }
    return merged
}

/** A figure inside a grid whose column count is the same at every breakpoint (including a single-column, full-width figure at `columns: 1`). */
export function gridFigureSizing(
    src: ImageMetadata,
    columns: 1 | 2 | 3,
): FigureSizing {
    const width = columnWidth(columns)
    return {
        width,
        sizes: `(min-width: ${CONTAINER_CAP_BREAKPOINT}px) ${width}px, ${columnFluidExpr(columns)}`,
        widths: widthLadder(width, src.width),
    }
}

/**
 * A figure inside a grid whose column count itself changes across
 * breakpoints (`sm:`/`lg:` column-count utilities). `tiers` are ordered
 * widest-condition-first; the last tier is the sub-`sm:` fallback and takes
 * no `minWidth`.
 */
export function responsiveGridFigureSizing(
    src: ImageMetadata,
    tiers: [
        { minWidth: number; columns: number },
        ...{ minWidth: number; columns: number }[],
        { columns: number },
    ],
): FigureSizing {
    const sizes = tiers
        .flatMap((tier) => {
            if (!('minWidth' in tier)) return [columnFluidExpr(tier.columns)]
            const fixed = `(min-width: ${tier.minWidth}px) ${columnWidth(tier.columns)}px`
            // A tier's own breakpoint can fire before the container has
            // actually reached its 768px cap (e.g. `sm:` at 640px) — the
            // container is still fluid for that stretch, so the fixed pixel
            // width above is only correct from 768px up. Below that, this
            // tier's column count needs the fluid formula instead.
            if (tier.minWidth >= CONTAINER_CAP_BREAKPOINT) return [fixed]
            return [
                `(min-width: ${CONTAINER_CAP_BREAKPOINT}px) ${columnWidth(tier.columns)}px`,
                `(min-width: ${tier.minWidth}px) ${columnFluidExpr(tier.columns)}`,
            ]
        })
        .join(', ')
    const widths = mergeCloseWidths(
        tiers.flatMap((tier) =>
            widthLadder(columnWidth(tier.columns), src.width),
        ),
    )
    return { width: columnWidth(tiers[0].columns), sizes, widths }
}

/** A standalone figure spanning the full prose column width. */
export function fullWidthFigureSizing(src: ImageMetadata): FigureSizing {
    return gridFigureSizing(src, 1)
}

/** A standalone figure with its own explicit display width, narrower than the full column (e.g. a centered mobile screenshot). */
export function fixedWidthFigureSizing(
    src: ImageMetadata,
    width: number,
): FigureSizing {
    const breakpoint = width + CONTAINER_PADDING_PX
    return {
        width,
        sizes: `(min-width: ${breakpoint}px) ${width}px, ${columnFluidExpr(1)}`,
        widths: widthLadder(width, src.width),
    }
}
