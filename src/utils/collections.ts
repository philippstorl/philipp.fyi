import { getCollection, type CollectionEntry } from 'astro:content'

/** Collections whose schema has a `draft` field — `principles` has none. */
type DraftableCollection = 'work' | 'blog'

/** Published (non-draft) entries in a collection that supports drafts —
 * the shared `!data.draft` filter behind both work and blog. */
export async function getPublishedEntries<C extends DraftableCollection>(
    collection: C,
): Promise<CollectionEntry<C>[]> {
    return getCollection(collection, ({ data }) => !data.draft)
}
