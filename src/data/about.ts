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
        "Eight years building staffbase.com — from a one-person setup to the marketing website of a company whose product serves millions of employees worldwide. I joined as the company's first dedicated web developer and stayed long enough to see it through hypergrowth, acquisitions, and a full migration to a headless CMS. I built a lot of it by hand. I also built the team, the processes, the career track, and contributed to the long-term web strategy alongside the CMO and senior stakeholders.",
        "Full-stack in the real sense: PHP/Symfony backends, JavaScript frontends, infrastructure as code, and headless CMS — with a designer's eye from years of building interfaces myself. I care most about building things that last: systems, documentation, and processes that outlive their creator and scale beyond one person.",
    ],
    facts: [
        { label: 'Based', value: 'Leipzig / Chemnitz area, Germany' },
        { label: 'Background', value: '8 years web development' },
        { label: 'Focus', value: 'Full-stack · DevOps · Design' },
        { label: 'Working', value: 'Remote-first' },
    ],
}
