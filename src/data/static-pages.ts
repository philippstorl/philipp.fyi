import { hero } from '@/data/hero'
import { getYearsOfExperience } from '@/utils/experience'

interface StaticPage {
    title: string
    ogLabel: string
}

/** Per-page metadata for static pages, keyed by page (also the `/og/<key>.png`
 * slug). `title` is the page's <title>, OG card headline and og:image:alt;
 * home's is only its card headline (see `staticPageMeta`). */
export const STATIC_PAGES = {
    home: {
        title: hero.headline,
        ogLabel: `${getYearsOfExperience()} years building for the web`,
    },
    principles: { title: 'Principles', ogLabel: 'How I work' },
    about: { title: 'About', ogLabel: 'Who I am' },
    recommendations: { title: 'Recommendations', ogLabel: 'What others say' },
    work: { title: 'Work', ogLabel: 'Selected work' },
    contact: { title: 'Contact', ogLabel: 'Get in touch' },
    blog: { title: 'Blog', ogLabel: 'Writing on web development and tooling' },
    privacy: { title: 'Privacy Policy', ogLabel: 'Your data, explained' },
} as const satisfies Record<string, StaticPage>

export type StaticPageKey = keyof typeof STATIC_PAGES

export function ogImagePath(page: StaticPageKey): string {
    return `/og/${page}.png`
}

/** BaseLayout's `title`/`ogImage` for a static page.
 * Home is excluded: its <title> is the bare site name, not its `title`. */
export function staticPageMeta(page: Exclude<StaticPageKey, 'home'>): {
    title: string
    ogImage: string
} {
    return {
        title: STATIC_PAGES[page].title,
        ogImage: ogImagePath(page),
    }
}
