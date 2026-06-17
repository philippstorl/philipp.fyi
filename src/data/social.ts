export type SocialIcon = 'github' | 'linkedin' | 'mail'

export interface SocialLink {
    label: string
    href: string
    icon: SocialIcon
}

export const socialLinks: SocialLink[] = [
    {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/philipp-storl/',
        icon: 'linkedin',
    },
    {
        label: 'GitHub',
        href: 'https://github.com/philippstorl',
        icon: 'github',
    },
    {
        // Mail icon links to the contact section — no email address exposed
        label: 'Contact',
        href: '/#contact',
        icon: 'mail',
    },
]
