import { readFileSync } from 'node:fs'
import type { AstroIntegration } from 'astro'
import sitemap from '@astrojs/sitemap'

const NOINDEX_META = /<meta\s[^>]*name="?robots"?[^>]*content="?[^">]*noindex/i

export function isNoindexHtml(html: string): boolean {
    return NOINDEX_META.test(html)
}

/** @astrojs/sitemap, minus every page whose built HTML is noindex (e.g. /privacy/,
 * or /blog/ until a post publishes), so BaseLayout's `robots` prop is the only switch. */
export function sitemapWithoutNoindexPages(): AstroIntegration[] {
    let outDir: URL | undefined
    // Listed first: build:done hooks run in integration order, so dir is set before the filter runs.
    const captureOutDir: AstroIntegration = {
        name: 'sitemap-noindex-out-dir',
        hooks: {
            'astro:build:done': ({ dir }) => {
                outDir = dir
            },
        },
    }
    const filter = (page: string): boolean => {
        if (!outDir) throw new Error('sitemap filter ran before build:done')
        const { pathname } = new URL(page)
        // /blog/ -> blog/index.html; flat status pages like /404 -> 404.html.
        const file = pathname.endsWith('/')
            ? `.${pathname}index.html`
            : `.${pathname}.html`
        return !isNoindexHtml(readFileSync(new URL(file, outDir), 'utf8'))
    }
    return [captureOutDir, sitemap({ filter })]
}
