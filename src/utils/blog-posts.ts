import type { CollectionEntry } from 'astro:content'
import { getPublishedEntries } from './collections'

/** Published (non-draft) blog posts, newest first — the single source every
 * blog call site (index, [slug], rss.xml.ts, the OG image route) queries
 * from, so draft-filtering and sort order can't drift apart between them. */
export async function getPublishedBlogPosts(): Promise<
    CollectionEntry<'blog'>[]
> {
    const posts = await getPublishedEntries('blog')
    return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}
