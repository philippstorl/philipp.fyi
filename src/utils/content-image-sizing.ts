// Sizing for case-study prose figures (CaseStudyLayout.astro's max-w-3xl
// px-6 container). Below 768px the container is fluid, not capped-width.

const CONTAINER_CAP_PX = 720
const CONTAINER_CAP_BREAKPOINT = 768
const CONTAINER_PADDING_PX = 48
const GRID_GAP_PX = 16

interface FigureSizing {
    width: number
    sizes: string
    widths: number[]
    /** Astro `<Image>` layout mode — see the `full-width` vs `constrained` bullet in CLAUDE.md. */
    layout: 'full-width' | 'constrained'
}

interface SizeTier {
    minWidth: number
    expr: string
}

// 1x/2x/3x of `base`, unclamped — Astro's own getSrcSet() already clamps `widths`
// to the source's native width, so there's nothing to clamp against here.
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

// Sorts by minWidth descending before joining — `sizes` matches its first
// satisfied condition, so a wrong order silently picks the wrong value.
function buildSizesAttr(tiers: SizeTier[], fallbackExpr: string): string {
    const sorted = [...tiers].sort((a, b) => b.minWidth - a.minWidth)
    return [
        ...sorted.map((tier) => `(min-width: ${tier.minWidth}px) ${tier.expr}`),
        fallbackExpr,
    ].join(', ')
}

// Drops a candidate within `threshold` px of another, to avoid a separate
// build-time encode for two srcset widths a browser would never tell apart.
function mergeCloseWidths(widths: number[], threshold = 24): number[] {
    const sorted = [...widths].sort((a, b) => a - b)
    const merged: number[] = []
    for (const width of sorted) {
        const last = merged[merged.length - 1]
        if (last === undefined || width - last > threshold) {
            merged.push(width)
        }
    }
    return merged
}

// Tiers for responsiveGridFigureSizing. A named export rather than a `Parameters<typeof ...>`
// derivation at the call site — MDX's body parser reads `<` as a JSX tag and chokes on generics.
export type ResponsiveGridTiers = [
    { minWidth: number; columns: number },
    ...{ minWidth: number; columns: number }[],
    { columns: number },
]

// Caps the fallback ladder at the narrowest real tier's breakpoint, not
// columnWidth(1) -- below that point the container isn't at its cap yet.
function responsiveWidths(
    realTiers: { minWidth: number; columns: number }[],
    fallback: { columns: number },
): number[] {
    // Math.min over every tier, not array position — ordering isn't guaranteed.
    const narrowestRealTierMinWidth = Math.min(
        ...realTiers.map((tier) => tier.minWidth),
    )
    const fallbackBase = Math.min(
        columnWidth(fallback.columns),
        narrowestRealTierMinWidth - CONTAINER_PADDING_PX,
    )
    const realBases = realTiers.map((tier) => columnWidth(tier.columns))
    const realCandidates = realBases.flatMap((base) => widthLadder(base))
    const fallbackCandidates = widthLadder(fallbackBase)

    // Bridges the gap between the two ladders with their geometric mean,
    // skipped when fallbackBase already coincides with a real base (no gap to bridge).
    const nextRealAboveFallback = Math.min(
        ...realCandidates.filter((width) => width > fallbackBase),
    )
    const bridge =
        Number.isFinite(nextRealAboveFallback) &&
        fallbackBase > 0 &&
        !realBases.includes(fallbackBase)
            ? Math.round(Math.sqrt(fallbackBase * nextRealAboveFallback))
            : undefined

    return mergeCloseWidths(
        [...realCandidates, ...fallbackCandidates, bridge].filter(
            (width): width is number => width !== undefined,
        ),
    )
}

/** Figure in a grid whose column count changes at breakpoints. `tiers`
 * widest-first; last tier is the sub-`sm:` fallback with no `minWidth`. */
export function responsiveGridFigureSizing(
    tiers: ResponsiveGridTiers,
): FigureSizing {
    // ResponsiveGridTiers' own shape ([A, ...A[], B]) guarantees a last
    // element, but the type checker can't see that through a computed index.
    const fallback = tiers[tiers.length - 1]
    if (!fallback) {
        throw new Error('ResponsiveGridTiers must include a fallback tier')
    }
    const realTiers = tiers.filter(
        (tier): tier is { minWidth: number; columns: number } =>
            'minWidth' in tier,
    )
    const sizeTiers: SizeTier[] = realTiers.flatMap((tier) => {
        const width = columnWidth(tier.columns)
        // A tier's own breakpoint can fire before the container reaches its
        // 768px cap, so the range below that still needs the fluid formula.
        if (tier.minWidth >= CONTAINER_CAP_BREAKPOINT) {
            return [{ minWidth: tier.minWidth, expr: `${width}px` }]
        }
        return [
            { minWidth: CONTAINER_CAP_BREAKPOINT, expr: `${width}px` },
            { minWidth: tier.minWidth, expr: columnFluidExpr(tier.columns) },
        ]
    })
    // Widest real tier by minWidth, not tiers[0] — order isn't guaranteed.
    const widestRealTier = realTiers.reduce((widest, tier) =>
        tier.minWidth > widest.minWidth ? tier : widest,
    )
    return {
        width: columnWidth(widestRealTier.columns),
        sizes: buildSizesAttr(sizeTiers, columnFluidExpr(fallback.columns)),
        widths: responsiveWidths(realTiers, fallback),
        layout: 'full-width',
    }
}

/** A figure inside a grid whose column count never changes (`columns: 1` is a standalone full-width figure). Delegates to `responsiveGridFigureSizing` with one always-on tier. */
export function gridFigureSizing(columns: 1 | 2 | 3): FigureSizing {
    return responsiveGridFigureSizing([
        { minWidth: CONTAINER_CAP_BREAKPOINT, columns },
        { columns },
    ])
}

/** A standalone figure spanning the full prose column width. */
export function fullWidthFigureSizing(): FigureSizing {
    return gridFigureSizing(1)
}

/** Figure with an explicit width narrower than the column. Pass `row` when
 * siblings share a row above a breakpoint, to size the squeeze before then. */
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
            // Siblings squeeze fluidly until rowFixedBreakpoint, where they fit at full width.
            tiers.push(
                { minWidth: rowFixedBreakpoint, expr: `${width}px` },
                {
                    minWidth: row.breakpoint,
                    expr: columnFluidExpr(row.siblings),
                },
            )
        } else {
            // Degenerate case: siblings already fit at full width the moment the row shares.
            tiers.push({ minWidth: row.breakpoint, expr: `${width}px` })
        }
    }
    return {
        width,
        sizes: buildSizesAttr(tiers, columnFluidExpr(1)),
        widths: widthLadder(width),
        // Deliberately narrower than the column at every viewport, mobile
        // included — must never stretch to fill it, unlike the grid helpers above.
        layout: 'constrained',
    }
}

// Sizing for WorkCard.astro's cover (WorkGrid.astro's own max-w-6xl container).
// Independent of CONTAINER_CAP_* above, which is for the narrower max-w-3xl prose column.
const WORK_GRID_CAP_PX = 1104 // max-w-6xl (1152px) minus 2x px-6 (48px)
const WORK_GRID_CAP_BREAKPOINT = 1152
const WORK_GRID_PADDING_PX = 48
const WORK_GRID_COLUMN_BREAKPOINT = 768 // Tailwind `md`: grid-cols-1 -> md:grid-cols-3
const WORK_GRID_GAP_PX = 16 // gap-4

/** 1 column below `md` (768px), 3 columns above, capped at the container's 1152px. */
export function workCardCoverSizing(): Pick<FigureSizing, 'sizes' | 'widths'> {
    const threeColCappedWidth = Math.round(
        (WORK_GRID_CAP_PX - 2 * WORK_GRID_GAP_PX) / 3,
    )
    const threeColFluidExpr = `calc((100vw - ${WORK_GRID_PADDING_PX + 2 * WORK_GRID_GAP_PX}px) / 3)`
    const oneColFluidExpr = `calc(100vw - ${WORK_GRID_PADDING_PX}px)`

    const sizes = buildSizesAttr(
        [
            {
                minWidth: WORK_GRID_CAP_BREAKPOINT,
                expr: `${threeColCappedWidth}px`,
            },
            { minWidth: WORK_GRID_COLUMN_BREAKPOINT, expr: threeColFluidExpr },
        ],
        oneColFluidExpr,
    )

    // One-column tier only wins below 768px (always fluid there) -- cap its
    // ladder there, not at the 1152px cap it never reaches.
    const oneColCappedWidth = WORK_GRID_COLUMN_BREAKPOINT - WORK_GRID_PADDING_PX

    const widths = mergeCloseWidths([
        ...widthLadder(threeColCappedWidth),
        ...widthLadder(oneColCappedWidth),
    ])

    return { sizes, widths }
}

// Reused grid-tier shapes for MDX case studies, defined here rather than as MDX-local
// consts since `astro check` doesn't type-check expressions inside an MDX body at all.
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
