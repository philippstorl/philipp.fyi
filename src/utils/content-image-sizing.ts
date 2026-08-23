// Sizing helpers for figures inside the case-study/blog prose column
// (CaseStudyLayout.astro's `mx-auto max-w-3xl px-6` container — see the
// comment on that div, kept in sync with the constants below: 720px content
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

interface SizeTier {
    minWidth: number
    expr: string
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

// Builds a CSS `sizes` attribute from a list of `(min-width: N) expr`
// conditions plus a final unconditional fallback. Sorts `tiers` by
// `minWidth` descending itself rather than trusting callers to pass them in
// order — a `sizes` attribute matches its first satisfied condition, so a
// wrong order silently changes which value wins at a given viewport.
function buildSizesAttr(tiers: SizeTier[], fallbackExpr: string): string {
    const sorted = [...tiers].sort((a, b) => b.minWidth - a.minWidth)
    return [
        ...sorted.map((tier) => `(min-width: ${tier.minWidth}px) ${tier.expr}`),
        fallbackExpr,
    ].join(', ')
}

// Combining multiple tiers' own 1x/2x/3x ladders can land two candidates
// within a few percent of each other (e.g. 704px and 720px) — each still
// costs a full separate build-time encode for no real browser-selection
// benefit. Drops a candidate whenever another survives within `threshold` of
// it — this can drop a tier's own exact value in favor of a close neighbor
// from a different tier (not "only ever removes true duplicates"), which is
// fine: `threshold` (24px, a few percent of any real width here) is chosen
// specifically to be well under any perceptible quality difference.
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
        sizes: buildSizesAttr(
            [{ minWidth: CONTAINER_CAP_BREAKPOINT, expr: `${width}px` }],
            columnFluidExpr(columns),
        ),
        widths: widthLadder(width),
    }
}

/**
 * `tiers` for `responsiveGridFigureSizing`, exported so a call site that
 * reuses the same tier shape across several figures (e.g. several images in
 * one MDX file) can name it as a typed constant instead of repeating the
 * array literal — written as a named export rather than derived inline via
 * `Parameters<typeof ...>` at the call site, since MDX's body parser reads
 * `<` as the start of a JSX tag and chokes on TypeScript generic syntax
 * there (confirmed: `Parameters<typeof fn>` broke the MDX build with
 * "Expected a closing tag for `<typeof>`").
 */
export type ResponsiveGridTiers = [
    { minWidth: number; columns: number },
    ...{ minWidth: number; columns: number }[],
    { columns: number },
]

/**
 * A figure inside a grid whose column count itself changes across
 * breakpoints (`sm:`/`lg:` column-count utilities). `tiers` are ordered
 * widest-condition-first; the last tier is the sub-`sm:` fallback and takes
 * no `minWidth`.
 */
export function responsiveGridFigureSizing(
    tiers: ResponsiveGridTiers,
): FigureSizing {
    const fallback = tiers[tiers.length - 1]
    const sizeTiers: SizeTier[] = tiers.flatMap((tier) => {
        if (!('minWidth' in tier)) return []
        const width = columnWidth(tier.columns)
        // A tier's own breakpoint can fire before the container has
        // actually reached its 768px cap (e.g. `sm:` at 640px) — the
        // container is still fluid for that stretch, so the fixed pixel
        // width is only correct from 768px up. Below that, this tier's
        // column count needs the fluid formula instead.
        if (tier.minWidth >= CONTAINER_CAP_BREAKPOINT) {
            return [{ minWidth: tier.minWidth, expr: `${width}px` }]
        }
        return [
            { minWidth: CONTAINER_CAP_BREAKPOINT, expr: `${width}px` },
            { minWidth: tier.minWidth, expr: columnFluidExpr(tier.columns) },
        ]
    })
    // The fallback tier's own `sizes` condition (no `minWidth`) only ever
    // wins below the narrowest real tier's breakpoint, where the container
    // is fluid and never reaches that tier's full columnWidth() — using
    // columnWidth() as this one tier's ladder base would generate 2x/3x
    // candidates no viewport in the fallback's actual active range could
    // ever request. Cap it at the narrowest real tier's own breakpoint
    // (minus the container padding) instead, the true upper bound of the
    // fallback's fluid width.
    const realTiers = tiers.filter(
        (tier): tier is { minWidth: number; columns: number } =>
            'minWidth' in tier,
    )
    const narrowestRealTierMinWidth = realTiers[realTiers.length - 1].minWidth
    const widths = mergeCloseWidths(
        tiers.flatMap((tier) => {
            const base =
                tier === fallback
                    ? Math.min(
                          columnWidth(tier.columns),
                          narrowestRealTierMinWidth - CONTAINER_PADDING_PX,
                      )
                    : columnWidth(tier.columns)
            return widthLadder(base)
        }),
    )
    return {
        width: columnWidth(tiers[0].columns),
        sizes: buildSizesAttr(sizeTiers, columnFluidExpr(fallback.columns)),
        widths,
    }
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
    const tiers: SizeTier[] = [
        { minWidth: width + CONTAINER_PADDING_PX, expr: `${width}px` },
    ]
    if (row) {
        const rowFixedBreakpoint =
            width * row.siblings +
            (row.siblings - 1) * GRID_GAP_PX +
            CONTAINER_PADDING_PX
        if (rowFixedBreakpoint > row.breakpoint) {
            // The normal case: siblings don't all fit at their full `width`
            // the moment the row starts sharing (row.breakpoint) — there's a
            // real squeezed range in between where the fluid formula applies,
            // before `rowFixedBreakpoint` where they do all fit.
            tiers.push(
                { minWidth: rowFixedBreakpoint, expr: `${width}px` },
                {
                    minWidth: row.breakpoint,
                    expr: columnFluidExpr(row.siblings),
                },
            )
        } else {
            // Degenerate case: the siblings already fit at their full width
            // as soon as the row starts sharing — there's no squeezed range,
            // so no fluid tier is needed (adding one anyway would put it
            // *above* the fixed tier in sort order, since it'd have the
            // larger minWidth, and wrongly win for every wider viewport too).
            tiers.push({ minWidth: row.breakpoint, expr: `${width}px` })
        }
    }
    return {
        width,
        sizes: buildSizesAttr(tiers, columnFluidExpr(1)),
        widths: widthLadder(width),
    }
}

// Named `responsiveGridFigureSizing` tier shapes, reused across several
// figures within a single case study (voices-conference-website.mdx today).
// Defined here rather than as `export const`s inside the MDX file itself —
// MDX file bodies aren't real TypeScript: `astro check` doesn't type-check
// expressions there at all (confirmed by intentionally breaking a tier
// object's shape in an MDX-local constant — it passed `npm run typecheck`
// AND `npm run build` with zero errors, then silently shipped a broken
// `sizes="...calc((100vw - NaNpx) / undefined)..."` into production HTML).
// A constant declared here, by contrast, is checked against
// `ResponsiveGridTiers` like any other TypeScript value — the same class of
// typo (a missing `columns` field) is a compile error instead of a silent
// runtime `NaN`.
export const TWO_COLUMN_RESPONSIVE_TIERS: ResponsiveGridTiers = [
    { minWidth: 640, columns: 2 },
    { columns: 1 },
]
export const THREE_COLUMN_RESPONSIVE_TIERS: ResponsiveGridTiers = [
    { minWidth: 1024, columns: 3 },
    { minWidth: 640, columns: 2 },
    { columns: 1 },
]
export const REGIONAL_RESPONSIVE_TIERS: ResponsiveGridTiers = [
    { minWidth: 640, columns: 3 },
    { columns: 1 },
]
