// Shared by NavLink.astro and Header.astro's updateActiveNav() so they can't drift.
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
