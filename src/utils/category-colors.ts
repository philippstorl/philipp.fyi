export type WorkCategory = 'Engineering' | 'Design' | 'Leadership'

// Synced with CATEGORY_HEX_COLORS below (og-image.ts can't use Tailwind).
// rose-700/yellow-800 picked deliberately for contrast -- don't swap for a nearby hue.
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

// Light-mode hex equivalents for og-image.ts (Satori, no dark mode).
export const CATEGORY_HEX_COLORS: Record<
    WorkCategory,
    { border: string; text: string }
> = {
    Engineering: { border: 'rgba(199, 0, 54, 0.3)', text: '#C70036' },
    Design: { border: 'rgba(25, 60, 184, 0.3)', text: '#193CB8' },
    Leadership: { border: 'rgba(137, 75, 0, 0.3)', text: '#894B00' },
}
