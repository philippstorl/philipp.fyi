export interface NavItem {
    label: string
    /** Full href — every nav item points at its own dedicated route */
    href: string
    /** Mark as external to open in new tab */
    external?: boolean
}

export const navItems: NavItem[] = [
    { label: 'Work', href: '/work/' },
    { label: 'About', href: '/about/' },
    { label: 'Principles', href: '/principles/' },
    { label: 'Recommendations', href: '/recommendations/' },
    { label: 'Contact', href: '/contact/' },
]
