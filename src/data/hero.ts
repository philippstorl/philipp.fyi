import { GITHUB_URL, LINKEDIN_URL, type SocialIcon } from '@/data/social'
import {
    getStaffbaseTenureYears,
    getYearsOfExperience,
} from '@/utils/experience'

export interface HeroLink {
    label: string
    href: string
    icon: Exclude<SocialIcon, 'mail'>
}

export interface HeroData {
    /** Set to false to hide the availability badge once hired */
    available: boolean
    availabilityText: string
    headline: string
    subheading: string
    description: string
    experienceTagline: string
    location: string
    links: HeroLink[]
}

export const hero: HeroData = {
    available: true,
    availabilityText: 'Open to new opportunities',
    headline: 'I build things that last.',
    subheading: "Principal Web Developer, full-stack, with a designer's eye.",
    description: `${getStaffbaseTenureYears()} years turning a one-person web setup into a scalable platform.`,
    experienceTagline: `${getYearsOfExperience()} years building for the web.`,
    location: 'Chemnitz / Leipzig area, Germany · Remote-first.',
    links: [
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
    ],
}
