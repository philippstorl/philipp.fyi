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

// 1x/2x/3x of `base`. Deliberately unclamped against any source's native
// width — Astro's own `getSrcSet()` (services/service.js) already filters
// any `widths` array down to the source's native width and pushes that
// native width back in as a fallback if every candidate would otherwise
// exceed it, for any locally-imported image. A from-scratch clamp here would
// be a second copy of the same logic to keep in sync for no benefit, and
// these helpers have no per-image input to clamp against in the first place
// — they're pure functions of layout geometry (column count / fixed width),
// not of any particular source image.
function widthLadder(base: number): number[] {
    return [base, base * 2, base * 3]
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

function fixedSizeCondition(minWidth: number, width: number): string {
    return `(min-width: ${minWidth}px) ${width}px`
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
export function gridFigureSizing(columns: 1 | 2 | 3): FigureSizing {
    const width = columnWidth(columns)
    return {
        width,
        sizes: `${fixedSizeCondition(CONTAINER_CAP_BREAKPOINT, width)}, ${columnFluidExpr(columns)}`,
        widths: widthLadder(width),
    }
}

/**
 * A figure inside a grid whose column count itself changes across
 * breakpoints (`sm:`/`lg:` column-count utilities). `tiers` are ordered
 * widest-condition-first; the last tier is the sub-`sm:` fallback and takes
 * no `minWidth`.
 */
export function responsiveGridFigureSizing(
    tiers: [
        { minWidth: number; columns: number },
        ...{ minWidth: number; columns: number }[],
        { columns: number },
    ],
): FigureSizing {
    const sizes = tiers
        .flatMap((tier) => {
            if (!('minWidth' in tier)) return [columnFluidExpr(tier.columns)]
            const width = columnWidth(tier.columns)
            // A tier's own breakpoint can fire before the container has
            // actually reached its 768px cap (e.g. `sm:` at 640px) — the
            // container is still fluid for that stretch, so the fixed pixel
            // width is only correct from 768px up. Below that, this tier's
            // column count needs the fluid formula instead.
            if (tier.minWidth >= CONTAINER_CAP_BREAKPOINT) {
                return [fixedSizeCondition(tier.minWidth, width)]
            }
            return [
                fixedSizeCondition(CONTAINER_CAP_BREAKPOINT, width),
                `(min-width: ${tier.minWidth}px) ${columnFluidExpr(tier.columns)}`,
            ]
        })
        .join(', ')
    const widths = mergeCloseWidths(
        tiers.flatMap((tier) => widthLadder(columnWidth(tier.columns))),
    )
    return { width: columnWidth(tiers[0].columns), sizes, widths }
}

/** A standalone figure spanning the full prose column width. */
export function fullWidthFigureSizing(): FigureSizing {
    return gridFigureSizing(1)
}

/**
 * A standalone figure with its own explicit display width, narrower than
 * the full column (e.g. a centered mobile screenshot). Pass `row` when two
 * or more of these sit side by side above a breakpoint (e.g. inside a
 * `flex-col sm:flex-row` wrapper) — without it, `sizes` assumes this figure
 * is the only occupant of its row at every viewport, which understates the
 * real squeeze once siblings share the row but haven't yet reached their
 * full width.
 */
export function fixedWidthFigureSizing(
    width: number,
    row?: { siblings: number; breakpoint: number },
): FigureSizing {
    const tiers: { minWidth: number; expr: string }[] = [
        { minWidth: width + CONTAINER_PADDING_PX, expr: `${width}px` },
    ]
    if (row) {
        const rowFixedBreakpoint =
            width * row.siblings +
            (row.siblings - 1) * GRID_GAP_PX +
            CONTAINER_PADDING_PX
        tiers.push(
            { minWidth: rowFixedBreakpoint, expr: `${width}px` },
            {
                minWidth: row.breakpoint,
                expr: columnFluidExpr(row.siblings),
            },
        )
    }
    tiers.sort((a, b) => b.minWidth - a.minWidth)
    const sizes = [
        ...tiers.map((tier) => `(min-width: ${tier.minWidth}px) ${tier.expr}`),
        columnFluidExpr(1),
    ].join(', ')
    return { width, sizes, widths: widthLadder(width) }
}
