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
        // is:inline scripts aren't auto-hashed -- if ThemeToggle's script changes,
        // recompute over its dist/index.html (not source) output (openssl dgst -sha256 | base64).
        // `data:` = View Transitions sentinel.
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
