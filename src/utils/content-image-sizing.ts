import type { ImageMetadata } from 'astro'

// Sizing helpers for figures inside the case-study/blog prose column
// (CaseStudyLayout.astro's `mx-auto max-w-3xl px-6` container: 720px content
// width once the viewport itself reaches 816px — max-w-3xl's 768px plus
// px-6's 48px of horizontal padding). Below that breakpoint the container is
// fluid, so every figure here — even one inside a grid whose column count
// never changes — genuinely shrinks with the viewport. A `sizes` value that
// only ever states the desktop pixel width (as an earlier version of these
// case studies did) makes a device with a smaller real box fetch a larger
// srcset candidate than it needs, purely because pixel-density srcset
// (`densities`) has no way to know the box shrank. These helpers compute an
// accurate `sizes`/`widths` pair instead.

const CONTAINER_CAP_PX = 720
const CONTAINER_CAP_BREAKPOINT = 816
const CONTAINER_PADDING_PX = 48
const GRID_GAP_PX = 16

interface FigureSizing {
    width: number
    sizes: string
    widths: number[]
}

// 1x/2x/3x of `base`, clamped to the source's own native width so a small
// image is never upscaled.
function widthLadder(base: number, nativeWidth: number): number[] {
    return [base, base * 2, base * 3].filter((w) => w <= nativeWidth)
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

/** A figure inside a grid whose column count is the same at every breakpoint. */
export function gridFigureSizing(
    src: ImageMetadata,
    columns: 2 | 3,
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
        .map((tier) =>
            'minWidth' in tier
                ? `(min-width: ${tier.minWidth}px) ${columnWidth(tier.columns)}px`
                : columnFluidExpr(tier.columns),
        )
        .join(', ')
    const widths = Array.from(
        new Set(
            tiers.flatMap((tier) =>
                widthLadder(columnWidth(tier.columns), src.width),
            ),
        ),
    ).sort((a, b) => a - b)
    return { width: columnWidth(tiers[0].columns), sizes, widths }
}

/** A standalone figure spanning the full prose column width. */
export function fullWidthFigureSizing(src: ImageMetadata): FigureSizing {
    return {
        width: CONTAINER_CAP_PX,
        sizes: `(min-width: ${CONTAINER_CAP_BREAKPOINT}px) ${CONTAINER_CAP_PX}px, ${columnFluidExpr(1)}`,
        widths: widthLadder(CONTAINER_CAP_PX, src.width),
    }
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
