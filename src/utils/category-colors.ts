export type WorkCategory = 'Engineering' | 'Design' | 'Leadership'

// Tailwind classes for the pill badge — used by WorkCard.astro and
// CaseStudyLayout.astro. Kept in sync with CATEGORY_HEX_COLORS below, the
// hex equivalent used by og-image.ts (Satori can't consume Tailwind classes).
export const CATEGORY_BADGE_CLASSES: Record<WorkCategory, string> = {
    Engineering: 'border-accent/30 text-accent',
    Design: 'border-blue-800/30 text-blue-800 dark:border-blue-400/30 dark:text-blue-400',
    Leadership:
        'border-amber-700/30 text-amber-700 dark:border-amber-400/30 dark:text-amber-400',
}

export function getCategoryBadgeClass(category: WorkCategory): string {
    return CATEGORY_BADGE_CLASSES[category]
}

// Hex equivalents of the same categories' light-mode colors (OG images
// always render on the light background, so no dark-mode variant is
// needed), derived from Tailwind v4's --color-blue-800/--color-amber-700
// OKLCH tokens the same way og-image.ts's `colors.accent` approximates
// --color-accent.
export const CATEGORY_HEX_COLORS: Record<
    WorkCategory,
    { border: string; text: string }
> = {
    Engineering: { border: 'rgba(200, 90, 42, 0.3)', text: '#C85A2A' },
    Design: { border: 'rgba(25, 60, 184, 0.3)', text: '#193CB8' },
    Leadership: { border: 'rgba(187, 77, 0, 0.3)', text: '#BB4D00' },
}
