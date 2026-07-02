export type WorkCategory = 'Engineering' | 'Design' | 'Leadership'

// Tailwind classes for the pill badge — used by WorkCard.astro and
// CaseStudyLayout.astro. Kept in sync with CATEGORY_HEX_COLORS below, the
// hex equivalent used by og-image.ts (Satori can't consume Tailwind classes).
//
// Engineering and Leadership each use a standard Tailwind swatch rather
// than --color-accent/a default amber swatch (issue #62): a
// dark-enough-for-AA shade of any hue between roughly 35-50 (accent's
// terracotta through amber-700/800) reads as the same muted rust-brown on
// the near-white background, so hue alone can't make the two badges look
// distinct. Splitting them across the wider warm range instead —
// Engineering as rose-700 (a true red, hue ~17) and Leadership as
// yellow-700 (a true gold, hue ~66) — works because sRGB has far more
// chroma headroom for reds than for golds at this lightness, so
// Engineering reads as vivid rather than muddy. This also decouples
// Engineering's badge from --color-accent, the sitewide brand color
// (hero, links, buttons, focus rings, OG bar) — those are unaffected and
// still use --color-accent's terracotta directly.
export const CATEGORY_BADGE_CLASSES: Record<WorkCategory, string> = {
    Engineering:
        'border-rose-700/30 text-rose-700 dark:border-rose-400/30 dark:text-rose-400',
    Design: 'border-blue-800/30 text-blue-800 dark:border-blue-400/30 dark:text-blue-400',
    Leadership:
        'border-yellow-700/30 text-yellow-700 dark:border-amber-400/30 dark:text-amber-400',
}

export function getCategoryBadgeClass(category: WorkCategory): string {
    return CATEGORY_BADGE_CLASSES[category]
}

// Hex equivalents of the same categories' light-mode colors (OG images
// always render on the light background, so no dark-mode variant is
// needed), derived from Tailwind v4's --color-rose-700/--color-blue-800/
// --color-yellow-700 OKLCH tokens the same way og-image.ts's
// `colors.accent` approximates --color-accent.
export const CATEGORY_HEX_COLORS: Record<
    WorkCategory,
    { border: string; text: string }
> = {
    Engineering: { border: 'rgba(199, 0, 54, 0.3)', text: '#C70036' },
    Design: { border: 'rgba(25, 60, 184, 0.3)', text: '#193CB8' },
    Leadership: { border: 'rgba(166, 95, 0, 0.3)', text: '#A65F00' },
}
