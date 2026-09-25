import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { SITE_NAME, getDefaultDescription } from '@/data/site'
import { stripContentExtension } from '@/utils/slug'
import { getPublishedBlogPosts } from '@/utils/blog-posts'
import { toAbsoluteUrl } from '@/utils/url'

export async function GET(context: APIContext) {
    const posts = await getPublishedBlogPosts()

    return rss({
        title: SITE_NAME,
        description: getDefaultDescription(),
        // Channel <link>; item links are root-relative, so they still resolve from the origin.
        site: toAbsoluteUrl('/blog/', context.site),
        items: posts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.date,
            description: post.data.description,
            link: `/blog/${stripContentExtension(post.id)}/`,
        })),
    })
}
