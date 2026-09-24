// Shared by NavLink.astro and Header.astro's updateActiveNav() so they can't drift.
// 'page' on an exact match; 'true' when inside the link's section (e.g. Work on
// /work/<slug>/), since the link itself goes to a different page. Any value
// means the link gets the visual active state.
export function getNavLinkAriaCurrent(
    pathname: string,
    href: string,
): 'page' | 'true' | undefined {
    if (!href || href.includes('#')) return undefined
    const normalizedPathname = pathname.endsWith('/')
        ? pathname
        : `${pathname}/`
    if (normalizedPathname === href) return 'page'
    // A bare '/' would otherwise prefix-match every pathname.
    if (href !== '/' && normalizedPathname.startsWith(href)) return 'true'
    return undefined
}

export const NAV_LINK_ACTIVE_CLASS = 'text-foreground'
export const NAV_LINK_INACTIVE_CLASSES = ['text-muted', 'hover:text-foreground']
export const NAV_LINK_UNDERLINE_ACTIVE_CLASS = 'after:w-full'
