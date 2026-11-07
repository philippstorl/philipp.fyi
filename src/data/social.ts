export type SocialIcon = 'github' | 'linkedin' | 'mail'

export const LINKEDIN_URL = 'https://www.linkedin.com/in/philipp-storl/'
export const GITHUB_URL = 'https://github.com/philippstorl'

export interface SocialLink {
    label: string
    href: string
    icon: SocialIcon
}

export const socialLinks: SocialLink[] = [
    {
        label: 'LinkedIn',
        href: LINKEDIN_URL,
        icon: 'linkedin',
    },
    {
        label: 'GitHub',
        href: GITHUB_URL,
        icon: 'github',
    },
    {
        // Mail icon links to the contact page — no email address exposed
        label: 'Contact',
        href: '/contact/',
        icon: 'mail',
    },
]
