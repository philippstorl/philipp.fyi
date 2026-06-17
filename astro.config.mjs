import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    site: 'https://philipp.fyi',
    trailingSlash: 'always',
    prefetch: true,
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
