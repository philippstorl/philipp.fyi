import { CURRENT_EMPLOYER } from '@/data/employer'

export interface CareerRole {
    title: string
    start: string
    end?: string
    highlights: string[]
    caseStudies?: string[]
}

export interface CareerEntry {
    company: string
    roles: CareerRole[]
}

export const career: CareerEntry[] = [
    {
        company: CURRENT_EMPLOYER.name,
        roles: [
            {
                title: 'Principal Web Engineer',
                start: '2026-10',
                highlights: [],
            },
        ],
    },
    {
        company: 'Staffbase',
        roles: [
            {
                title: 'Principal Web Developer',
                start: '2024-10',
                end: '2026-09',
                caseStudies: [
                    'storyblok-migration',
                    'brand-evolution',
                    'voices-conference-website',
                ],
                highlights: [
                    'Held the team’s deepest technical and infrastructure expertise on the migration of the product website to a headless CMS (Storyblok/Symfony) with agency partner SensioLabs: the quality gate keeping the rebuild faithful to the original in function and brand, pushing back on agency proposals that missed how Staffbase actually worked, and consolidating the component library into a leaner, maintainable set.',
                    'Led it from scoping in late 2024 through go-live in July 2025 and stabilization across the rest of the year: a faster, more stable site, far better editor experience than WordPress, better developer experience, improved scalability, and the first step in unifying Staffbase’s fragmented web properties onto one system.',
                    'Made the day-to-day calls on architecture, tooling, and technical direction, as the team’s most experienced engineer on the stack.',
                    'Contributed to web strategy with the CMO and senior stakeholders, drove the "One Staffbase Experience" initiative aligning Brand, Web, and Product Design, and authored the Web Team’s Vision and Mission document, naming fragmented ownership as a structural risk and proposing single ownership plus metrics tying web work to pipeline impact.',
                    'Expanded staffbase.com to five languages (English, German, French, Spanish, Japanese), holding quality across every locale as it grew.',
                    'Drove a navigation rebuild to a hard external deadline, coordinating SensioLabs, writing and reviewing code, shipping on time.',
                    'Built tooling and documentation that let marketing update the site without a developer, turning a bottleneck into self-service.',
                    'Owned the web tool stack, vendor contracts, and billing.',
                    'Set up the team’s AI-assisted development workflow: draft PRs reviewed and fixed with GitHub Copilot first, with a human required to review, approve, and understand the code before merge, plus Copilot instructions and Claude.md files. Connected web to the product engineering AI community. Faster shipping, fewer review cycles.',
                ],
            },
            {
                title: 'Team Lead Web Development',
                start: '2022-01',
                end: '2024-10',
                caseStudies: ['leadership-operating-model'],
                highlights: [
                    'Flagged WordPress’s growing instability, including slow load times, unpredictable bugs, and outages, as a business risk as early as 2022, and persisted for two years against leadership resistance until the technical risk was understood and the migration was greenlit.',
                    'Led the web development team (up to 4 people across Germany and Canada) for nearly 3 years, deliberately staying hands-on as a developer to add the engineering capacity the team needed.',
                    'Sustained a Vancouver-based direct report through six in-person visits over three years, roughly every six months, alongside day-to-day mentoring across a 9-hour time difference.',
                    'Created the web development career track, a progression model defining responsibilities across every IC level, later evolved from responsibility- to competency-based.',
                    'Introduced a sprint framework, adapting product-org best practices to the web team.',
                    'Built a dedicated request-intake system (Jira project, intake form, Slack automation) so all incoming work flowed through one clear path.',
                    'Set up a final go-live quality gate to protect design, copy, and SEO standards.',
                    'Migrated version control from Bitbucket to GitHub and introduced codeowners, PR-review, and CI standards.',
                    'Owned the web team’s budget, managing tooling, vendors, and spend across categories.',
                    'Led a complete rebrand of the entire web estate and consolidated four acquired brands (teambay, Bananatag, Valo, dirico) into one unified web presence.',
                    'Shipped the Japanese-language site, solving for a non-Latin script nobody on the team could read or proofread: fonts, imagery, and CSS. It opened the APAC market.',
                    'Owned the long-standing external web agency relationship, managing scope and quality across multi-year work, from the blog’s Gatsby-to-Astro migration to the careers website.',
                    'Stayed hands-on with the code while owning the UX/UI direction, giving feedback to the design team and our UX designer to keep the experience consistent and on-brand.',
                ],
            },
            {
                title: 'Lead Web Developer',
                start: '2021-10',
                end: '2021-12',
                highlights: [
                    'Stepped from senior individual contributor into technical leadership of the web function as the team began to scale, setting standards and direction. This was a technical lead role without formal people management, the first move toward building a dedicated web team.',
                    'Onboarded a new developer based in Vancouver, Canada to the team, the work, and our processes, traveling there to do it in person.',
                    'Kept multiple delivery streams running in parallel through the transition: the module library, HubSpot templates, the VOICES sites, and the start of the Bananatag acquisition integration (website and blog), while laying the groundwork for a dedicated web development team.',
                ],
            },
            {
                title: 'Senior Web Developer',
                start: '2018-03',
                end: '2021-09',
                highlights: [
                    'Joined as Staffbase’s first dedicated web developer and ran the marketing web end to end, initially as a one-person team: the homepage, key product and landing pages, and the VOICES conference sites, plus the web tool stack, budgets, contracts, and vendor billing.',
                    'Owned the full web stack, not just the front-end: a WordPress/SCSS site on Pagely, a Gatsby blog on headless WordPress (migrated off HubSpot), and Eleventy-built VOICES sites on Netlify as an early move to headless/JAMstack, plus HubSpot, Google Tag Manager as the hub for all marketing scripts, DNS, and domains.',
                    'Extended ownership beyond the formal staffbase.com scope to the VOICES and careers websites, and supported the support and developer portals with brand and UX guidance, including full design specs covering components, styling, and brand elements, so other teams and agencies could implement on-brand.',
                    'Owned deployments, hosting, and build pipelines end to end (automated via DeployHQ), handling the DevOps side hands-on.',
                    'Designed as well as built: wireframes, UI, and prototypes for pages, modules, and templates, plus design standards and brand consistency.',
                    'Built a reusable module and HubSpot-template system and ran A/B tests, designed from the start so the work could scale well beyond one person.',
                    'Drove technical SEO and web performance improvements: faster load times, cleaner indexing, and resilient handling of third-party scripts.',
                    'Owned web project management from the start, maintaining the backlog and planning delivery (Trello, later Jira).',
                    'Set the team’s first coding conventions (Git workflow, branch-naming, commit messages) and wrote its foundational knowledge bases.',
                    'Migrated the company blog from HubSpot to WordPress with an external web agency.',
                    'Made the web team’s first hire (wrote the JD, ran the process as hiring manager, onboarded the new developer) and became the marketing org’s go-to for web support.',
                ],
            },
        ],
    },
]
