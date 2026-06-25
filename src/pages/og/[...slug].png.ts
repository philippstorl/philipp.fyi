import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { generateOgImage } from '@/utils/og-image'
import { getYearsOfExperience } from '@/utils/experience'

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
        ...workEntries.map((entry) => ({
            params: { slug: `work/${entry.id.replace(/\.(mdx?|md)$/, '')}` },
            props: {
                title: entry.data.title,
                label: entry.data.category,
            },
        })),
    ]
}

export const GET: APIRoute = async ({ props }) => {
    const { title, label } = props as { title: string; label?: string }
    return generateOgImage(title, label)
}
