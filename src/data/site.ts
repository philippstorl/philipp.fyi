import {
    getStaffbaseTenureYears,
    getYearsOfExperience,
} from '@/utils/experience'

/** Site-wide name and default description, shared by BaseLayout.astro (meta
 * tags) and rss.xml.ts (feed title/description) so they can't drift apart. */
export const SITE_NAME = 'Philipp Storl'
export const DEFAULT_DESCRIPTION =
    "Principal Web Developer, full-stack, with a designer's eye. Based in Chemnitz / Leipzig area, Germany."

/** Shared by the homepage and /about/ so their meta descriptions can't
 * drift into two differently-worded copies of the same facts. */
export function getPrimaryDescription(): string {
    return `Principal Web Developer: full-stack, DevOps, design. ${getYearsOfExperience()} years building for the web, ${getStaffbaseTenureYears()} spent scaling staffbase.com. Remote-first, Chemnitz / Leipzig area.`
}
