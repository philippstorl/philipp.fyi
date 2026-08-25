import {
    getStaffbaseTenureYears,
    getYearsOfExperience,
} from '@/utils/experience'

/** Site-wide name, shared by BaseLayout.astro (meta tags) and rss.xml.ts
 * (feed title) so they can't drift apart. */
export const SITE_NAME = 'Philipp Storl'

/** The one description for BaseLayout's fallback, the RSS feed, and
 * homepage/about's explicit prop -- was two near-duplicate strings. */
export function getDefaultDescription(): string {
    return `Principal Web Developer: full-stack, DevOps, design. ${getYearsOfExperience()} years building for the web, ${getStaffbaseTenureYears()} spent scaling staffbase.com. Remote-first, Chemnitz / Leipzig area.`
}
