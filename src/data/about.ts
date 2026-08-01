import {
    getStaffbaseTenureYears,
    getYearsOfExperience,
} from '@/utils/experience'

export interface AboutFact {
    label: string
    value: string
}

export interface AboutData {
    paragraphs: string[]
    facts: AboutFact[]
}

export const about: AboutData = {
    paragraphs: [
        `${getYearsOfExperience()} years building for the web, the last ${getStaffbaseTenureYears()} of them at Staffbase. I joined as the company's first dedicated web developer, when the entire web presence was a one-person job, and stayed long enough to see the company through Series B to E funding, four acquisitions, and the climb to unicorn status at a $1.1B valuation, all while its product reached millions of employees worldwide.`,
        'I built a lot of staffbase.com by hand. I also hired and led the team that runs it, built the processes and the career track, and contributed to long-term web strategy alongside the CMO.',
        "Full-stack in the real sense: PHP/Symfony backends, JavaScript frontends, infrastructure as code, and headless CMS, with a designer's eye from years of building interfaces myself. I care most about building things that last: systems, documentation, and processes that outlive their creator and scale beyond one person.",
    ],
    facts: [
        { label: 'Based', value: 'Chemnitz / Leipzig area, Germany' },
        {
            label: 'Background',
            value: `${getYearsOfExperience()} years web development`,
        },
        { label: 'Focus', value: 'Full-stack · DevOps · Design' },
        { label: 'Working', value: 'Remote-first' },
    ],
}
