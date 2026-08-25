import {
    getStaffbaseTenureYears,
    getYearsOfExperience,
} from '@/utils/experience'

/** Site-wide name and default description, shared by BaseLayout.astro (meta
 * tags) and rss.xml.ts (feed title/description) so they can't drift apart. */
export const SITE_NAME = 'Philipp Storl'
export const DEFAULT_DESCRIPTION =
    "Principal Web Developer, full-stack, with a designer's eye. Based in Chemnitz / Leipzig area, Germany."

/** The homepage and /about/ page both need a meta description built from
 * the same facts (role, years, Staffbase tenure, location) -- they used to
 * each hand-write their own near-duplicate phrasing of it, reordered. One
 * shared function instead, so the two pages can't drift into two different
 * sentences describing the same thing. */
export function getPrimaryDescription(): string {
    return `Principal Web Developer: full-stack, DevOps, design. ${getYearsOfExperience()} years building for the web, ${getStaffbaseTenureYears()} spent scaling staffbase.com. Remote-first, Chemnitz / Leipzig area.`
}
