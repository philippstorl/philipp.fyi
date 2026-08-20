import { getCollection, type CollectionEntry } from 'astro:content'

/** Published (non-draft) blog posts, newest first — the single source both
 * /blog/ and rss.xml.ts query from, so draft-filtering and sort order can't
 * drift apart between the two. */
export async function getPublishedBlogPosts(): Promise<
    CollectionEntry<'blog'>[]
> {
    const posts = await getCollection('blog', ({ data }) => !data.draft)
    return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}
