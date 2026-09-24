import { hero } from '@/data/hero'
import { getYearsOfExperience } from '@/utils/experience'

interface StaticOgCard {
    title: string
    label: string
}

/** OG card copy per static page, keyed by `/og/<key>.png` slug. Each card's
 * title is also its page's <title>, so BaseLayout's image alt can't drift. */
export const STATIC_OG_CARDS = {
    home: {
        title: hero.headline,
        label: `${getYearsOfExperience()} years building for the web`,
    },
    principles: { title: 'Principles', label: 'How I work' },
    about: { title: 'About', label: 'Who I am' },
    recommendations: { title: 'Recommendations', label: 'What others say' },
    work: { title: 'Work', label: 'Selected work' },
    contact: { title: 'Contact', label: 'Get in touch' },
    blog: { title: 'Blog', label: 'Writing on web development and tooling' },
    privacy: { title: 'Privacy Policy', label: 'Your data, explained' },
} as const satisfies Record<string, StaticOgCard>

export type StaticOgPage = keyof typeof STATIC_OG_CARDS

export function staticOgImagePath(page: StaticOgPage): string {
    return `/og/${page}.png`
}

/** BaseLayout's `title`/`ogImage` for a static page, both from its OG card.
 * Home is excluded: its <title> is the bare site name, not the card headline. */
export function staticPageMeta(page: Exclude<StaticOgPage, 'home'>): {
    title: string
    ogImage: string
} {
    return {
        title: STATIC_OG_CARDS[page].title,
        ogImage: staticOgImagePath(page),
    }
}
