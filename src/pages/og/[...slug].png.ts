import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { generateOgImage } from '@/utils/og-image'
import { getYearsOfExperience } from '@/utils/experience'
import type { WorkCategory } from '@/utils/category-colors'

// entry.data.coverImage only exposes the Astro-optimized public URL (e.g.
// /_astro/hash.png), which isn't guaranteed to exist on disk yet during this
// same build pass. Reading the original source file via entry.filePath and
// re-parsing the frontmatter sidesteps that timing dependency entirely.
function resolveCoverImagePath(filePath: string): string | undefined {
    const raw = readFileSync(filePath, 'utf-8')
    const match = raw.match(/^coverImage:\s*"(.+)"$/m)
    return match ? resolve(dirname(filePath), match[1]) : undefined
}

export const getStaticPaths: GetStaticPaths = async () => {
    const workEntries = await getCollection('work', ({ data }) => !data.draft)

    return [
        {
            params: { slug: 'home' },
            props: {
                title: 'I build things that last.',
                label: `${getYearsOfExperience()} years building for the web`,
            },
        },
        {
            params: { slug: 'principles' },
            props: { title: 'Principles', label: 'How I work' },
        },
        {
            params: { slug: 'about' },
            props: { title: 'About', label: 'Who I am' },
        },
        {
            params: { slug: 'recommendations' },
            props: { title: 'Recommendations', label: 'What others say' },
        },
        ...workEntries.map((entry) => ({
            params: { slug: `work/${entry.id.replace(/\.(mdx?|md)$/, '')}` },
            props: {
                title: entry.data.title,
                category: entry.data.category,
                coverImagePath:
                    entry.data.coverImage && entry.filePath
                        ? resolveCoverImagePath(entry.filePath)
                        : undefined,
            },
        })),
    ]
}

export const GET: APIRoute = async ({ props }) => {
    const { title, label, coverImagePath, category } = props as {
        title: string
        label?: string
        coverImagePath?: string
        category?: WorkCategory
    }
    return generateOgImage(title, label, coverImagePath, category)
}
