import type { CollectionEntry } from 'astro:content'
import { getPublishedEntries } from './collections'

/** Published (non-draft) blog posts, newest first — the single source
 * every blog call site queries from, so sort order can't drift between them. */
export async function getPublishedBlogPosts(): Promise<
    CollectionEntry<'blog'>[]
> {
    const posts = await getPublishedEntries('blog')
    return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}
