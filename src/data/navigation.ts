export interface NavItem {
    label: string
    /** Full href — anchor links (#work) scroll on home, prefix with / on sub-pages */
    href: string
    /** Mark as external to open in new tab */
    external?: boolean
}

export const navItems: NavItem[] = [
    { label: 'Work', href: '/#work' },
    { label: 'Principles', href: '/principles/' },
    { label: 'Recommendations', href: '/recommendations/' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
]
