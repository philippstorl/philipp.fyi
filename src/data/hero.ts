import { GITHUB_URL, LINKEDIN_URL, type SocialIcon } from '@/data/social'
import { CURRENT_EMPLOYER } from '@/data/employer'
import { getYearsOfExperience } from '@/utils/experience'

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
    available: false,
    availabilityText: 'Open to new opportunities',
    headline: 'I build things that last.',
    subheading: 'Principal Web Engineer, full-stack, with a designer’s eye.',
    description: `Now at ${CURRENT_EMPLOYER.name}, after years of turning one-person web setups into platforms and teams that scale.`,
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

/** The subheading's first comma-clause: JSON-LD jobTitle and the home <title>. */
export const JOB_TITLE = hero.subheading.split(',')[0]!.trim() // split() always returns at least one element
