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
        // Astro doesn't auto-hash `is:inline` scripts, so ThemeToggle.astro's
        // pre-paint script needs its hash registered here by hand. Recompute
        // with `openssl dgst -sha256 -binary <file> | openssl base64` over the
        // exact <script> content in the built dist/index.html if it changes.
        //
        // `resources` replaces Astro's default `'self'`-only list, so `'self'`
        // is re-added explicitly; `data:` permits View Transitions' internal
        // `data:application/javascript,` load-order sentinel script.
        csp: {
            scriptDirective: {
                resources: ["'self'", 'data:'],
                hashes: ['sha256-IRaG082Oqalg5nWJ3yQUo4NGnPeCzDqF/rvDL4QO65M='],
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
