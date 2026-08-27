import type { APIRoute, GetStaticPaths } from 'astro'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { load as parseYaml } from 'js-yaml'
import { generateOgImage } from '@/utils/og-image'
import { getYearsOfExperience } from '@/utils/experience'
import { getPublishedEntries } from '@/utils/collections'
import { getPublishedBlogPosts } from '@/utils/blog-posts'
import { stripContentExtension } from '@/utils/slug'
import { formatBlogDate } from '@/utils/date'
import type { WorkCategory } from '@/utils/category-colors'

interface OgImageProps {
    title: string
    label?: string
    coverImagePath?: string
    category?: WorkCategory
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/

// coverImage's built URL may not exist on disk yet mid-build -- re-read the
// source frontmatter instead, via js-yaml so quoting/formatting can't break a regex.
function resolveCoverImagePath(filePath: string): string | undefined {
    const raw = readFileSync(filePath, 'utf-8')
    const frontmatterMatch = raw.match(FRONTMATTER_PATTERN)
    const frontmatterBlock = frontmatterMatch?.[1]
    if (frontmatterBlock === undefined) return undefined

    let frontmatter: unknown
    try {
        frontmatter = parseYaml(frontmatterBlock)
    } catch {
        return undefined
    }

    const coverImage =
        frontmatter &&
        typeof frontmatter === 'object' &&
        'coverImage' in frontmatter
            ? (frontmatter as { coverImage?: unknown }).coverImage
            : undefined

    return typeof coverImage === 'string'
        ? resolve(dirname(filePath), coverImage)
        : undefined
}

export const getStaticPaths: GetStaticPaths = async () => {
    const [workEntries, blogEntries] = await Promise.all([
        getPublishedEntries('work'),
        getPublishedBlogPosts(),
    ])

    return [
        {
            params: { slug: 'home' },
            props: {
                title: 'I build things that last.',
                label: `${getYearsOfExperience()} years building for the web`,
            } satisfies OgImageProps,
        },
        {
            params: { slug: 'principles' },
            props: {
                title: 'Principles',
                label: 'How I work',
            } satisfies OgImageProps,
        },
        {
            params: { slug: 'about' },
            props: { title: 'About', label: 'Who I am' } satisfies OgImageProps,
        },
        {
            params: { slug: 'recommendations' },
            props: {
                title: 'Recommendations',
                label: 'What others say',
            } satisfies OgImageProps,
        },
        {
            params: { slug: 'work' },
            props: {
                title: 'Work',
                label: 'Selected work',
            } satisfies OgImageProps,
        },
        {
            params: { slug: 'contact' },
            props: {
                title: 'Contact',
                label: 'Get in touch',
            } satisfies OgImageProps,
        },
        {
            params: { slug: 'blog' },
            props: {
                title: 'Blog',
                label: 'Writing on web development and tooling',
            } satisfies OgImageProps,
        },
        ...workEntries.map((entry) => {
            const coverImagePath =
                entry.data.coverImage && entry.filePath
                    ? resolveCoverImagePath(entry.filePath)
                    : undefined

            if (entry.data.coverImage && entry.filePath && !coverImagePath) {
                console.warn(
                    `[og-image] "${entry.id}" has a coverImage but its frontmatter couldn't be resolved to a file path — its OG image will render without the cover screenshot panel.`,
                )
            }

            return {
                params: { slug: `work/${stripContentExtension(entry.id)}` },
                props: {
                    title: entry.data.title,
                    category: entry.data.category,
                    coverImagePath,
                } satisfies OgImageProps,
            }
        }),
        // Blog has no category field, so it uses the plain-text `label`
        // slot instead of the badge. Empty today since every post is a draft.
        ...blogEntries.map((entry) => ({
            params: { slug: `blog/${stripContentExtension(entry.id)}` },
            props: {
                title: entry.data.title,
                label: formatBlogDate(entry.data.date),
            } satisfies OgImageProps,
        })),
    ]
}

export const GET: APIRoute<OgImageProps> = async ({ props }) => {
    const { title, label, coverImagePath, category } = props
    return generateOgImage(title, label, coverImagePath, category)
}
