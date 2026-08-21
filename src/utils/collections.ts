import { getCollection, type CollectionEntry } from 'astro:content'

/** Collections whose schema has a `draft` field — `principles` has none. */
type DraftableCollection = 'work' | 'blog'

/** Published (non-draft) entries in a collection that supports drafts.
 * Centralizes the `!data.draft` filter so every call site (WorkGrid,
 * work/[slug], blog/[slug], the OG image routes, the RSS feed) filters
 * drafts identically instead of re-deriving the same predicate. */
export async function getPublishedEntries<C extends DraftableCollection>(
    collection: C,
): Promise<CollectionEntry<C>[]> {
    return getCollection(collection, ({ data }) => !data.draft)
}
