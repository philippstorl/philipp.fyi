// Shared by Header.astro's server-rendered nav markup and its client-side
// updateActiveNav() script, so the two can't drift out of sync.
export function isNavLinkActive(pathname: string, href: string): boolean {
    if (href.includes('#')) return false
    const normalizedPathname = pathname.endsWith('/')
        ? pathname
        : `${pathname}/`
    // A bare '/' would otherwise prefix-match every pathname.
    if (href === '/') return normalizedPathname === '/'
    return normalizedPathname.startsWith(href)
}

// Shared active/inactive class vocabulary, so a future visual tweak to
// "what active looks like" only needs to change one place instead of
// staying in sync between NavLink.astro's SSR markup and Header.astro's
// client-side re-sync.
export const NAV_LINK_ACTIVE_CLASS = 'text-foreground'
export const NAV_LINK_INACTIVE_CLASSES = ['text-muted', 'hover:text-foreground']
export const NAV_LINK_DESKTOP_UNDERLINE_ACTIVE_CLASS = 'after:w-full'
