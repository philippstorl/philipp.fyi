// Shared by NavLink.astro and Header.astro's updateActiveNav() so they can't drift.
function withTrailingSlash(pathname: string): string {
    return pathname.endsWith('/') ? pathname : `${pathname}/`
}

export function isNavLinkActive(pathname: string, href: string): boolean {
    if (href.includes('#')) return false
    const normalizedPathname = withTrailingSlash(pathname)
    // A bare '/' would otherwise prefix-match every pathname.
    if (href === '/') return normalizedPathname === '/'
    return normalizedPathname.startsWith(href)
}

export function isNavLinkCurrentPage(pathname: string, href: string): boolean {
    if (href.includes('#')) return false
    return withTrailingSlash(pathname) === href
}

// 'page' only on an exact match; 'true' marks "inside this section" (e.g. Work
// on /work/<slug>/), since the link itself goes to a different page.
export function getNavLinkAriaCurrent(
    pathname: string,
    href: string,
): 'page' | 'true' | undefined {
    if (isNavLinkCurrentPage(pathname, href)) return 'page'
    return isNavLinkActive(pathname, href) ? 'true' : undefined
}

export const NAV_LINK_ACTIVE_CLASS = 'text-foreground'
export const NAV_LINK_INACTIVE_CLASSES = ['text-muted', 'hover:text-foreground']
export const NAV_LINK_UNDERLINE_ACTIVE_CLASS = 'after:w-full'
