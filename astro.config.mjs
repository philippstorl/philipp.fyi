import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    site: 'https://philipp.fyi',
    trailingSlash: 'always',
    prefetch: true,
    security: {
        csp: {
            // The default style-src hash allowlist only covers <style>
            // elements, not inline style="..." attributes — this site uses
            // the latter extensively (font-variation-settings on ~17
            // components). CSP has no hash mechanism for attribute-level
            // styles (needs 'unsafe-hashes', which Astro doesn't add), so
            // keep that one carve-out explicit rather than losing it.
            styleDirective: {
                resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }],
            },
        },
    },
    integrations: [
        mdx(),
        react(),
        sitemap({
            // Exclude the 404 page — it's not a real destination
            filter: (page) => !page.includes('/404'),
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
    },
})
