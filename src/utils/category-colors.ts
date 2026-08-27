export type WorkCategory = 'Engineering' | 'Design' | 'Leadership'

// Tailwind classes for the pill badge — used by WorkCard.astro and
// CaseStudyLayout.astro. Kept in sync with CATEGORY_HEX_COLORS below, the
// hex equivalent used by og-image.ts (Satori can't consume Tailwind classes).
//
// Engineering and Leadership each use a standard Tailwind swatch rather than
// a hue near --color-accent's terracotta: any dark-enough-for-AA shade in
// that warm range (hue ~35-50) reads as the same muted rust-brown on the
// near-white background, so hue alone can't make two accent-adjacent badges
// look distinct. Spreading them across the wider warm range instead —
// Engineering as rose-700 (a true red, hue ~17), Leadership as yellow-800
// (a true gold, hue ~62) — works because sRGB has far more chroma headroom
// for reds than golds at this lightness, so Engineering reads as vivid
// rather than muddy. This also decouples Engineering's badge from
// --color-accent, the sitewide brand color (hero, links, buttons, focus
// rings, OG bar), which still uses its terracotta directly. Leadership
// uses yellow-800, not yellow-700 — yellow-700 measures 4.01:1 against
// bg-card, below the 4.5:1 AA text-contrast threshold; yellow-800 clears
// it at 5.55:1.
export const CATEGORY_BADGE_CLASSES: Record<WorkCategory, string> = {
    Engineering:
        'border-rose-700/30 text-rose-700 dark:border-rose-400/30 dark:text-rose-400',
    Design: 'border-blue-800/30 text-blue-800 dark:border-blue-400/30 dark:text-blue-400',
    Leadership:
        'border-yellow-800/30 text-yellow-800 dark:border-amber-400/30 dark:text-amber-400',
}

export function getCategoryBadgeClass(category: WorkCategory): string {
    return CATEGORY_BADGE_CLASSES[category]
}

// Hex equivalents of the same categories' light-mode colors (OG images
// always render on the light background, so no dark-mode variant is
// needed), derived from Tailwind v4's --color-rose-700/--color-blue-800/
// --color-yellow-800 OKLCH tokens the same way og-image.ts's
// `colors.accent` approximates --color-accent.
export const CATEGORY_HEX_COLORS: Record<
    WorkCategory,
    { border: string; text: string }
> = {
    Engineering: { border: 'rgba(199, 0, 54, 0.3)', text: '#C70036' },
    Design: { border: 'rgba(25, 60, 184, 0.3)', text: '#193CB8' },
    Leadership: { border: 'rgba(137, 75, 0, 0.3)', text: '#894B00' },
}
