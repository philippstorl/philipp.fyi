// Shared by NavLink.astro's server-rendered markup and Header.astro's
// client-side updateActiveNav() script, so active-link matching and
// class vocabulary can't drift out of sync between the two.
export function isNavLinkActive(pathname: string, href: string): boolean {
    if (href.includes('#')) return false
    const normalizedPathname = pathname.endsWith('/')
        ? pathname
        : `${pathname}/`
    // A bare '/' would otherwise prefix-match every pathname.
    if (href === '/') return normalizedPathname === '/'
    return normalizedPathname.startsWith(href)
}

export const NAV_LINK_ACTIVE_CLASS = 'text-foreground'
export const NAV_LINK_INACTIVE_CLASSES = ['text-muted', 'hover:text-foreground']
export const NAV_LINK_UNDERLINE_ACTIVE_CLASS = 'after:w-full'
