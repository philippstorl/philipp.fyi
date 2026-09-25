import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    site: 'https://philipp.fyi',
    trailingSlash: 'always',
    prefetch: true,
    // Keep in sync with .prettierrc.json's astroCompressHTML.
    compressHTML: true,
    security: {
        // is:inline scripts aren't auto-hashed -- if ThemeToggle's script changes,
        // recompute over its dist/index.html (not source) output (openssl dgst -sha256 | base64).
        // No `data:`: it would let an injected <script src="data:..."> through.
        csp: {
            scriptDirective: {
                resources: ["'self'"],
                hashes: ['sha256-utnkX60dhgydIywfkzN8vNyWLG8VHV2/nnt2c5rm7OY='],
            },
        },
    },
    integrations: [
        mdx(),
        react(),
        sitemap({
            // Exclude the 404 page (not a real destination) and /privacy/
            // (noindex). Exact pathname match, not a substring check, so a
            // future route that merely contains "404"/"privacy" isn't
            // silently dropped too.
            filter: (page) => {
                const { pathname } = new URL(page)
                return pathname !== '/404' && pathname !== '/privacy/'
            },
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
        build: {
            // Never inline any JS (Astro <script> chunks included): an inline module
            // script makes ClientRouter inject a data: barrier that script-src blocks.
            // Guarded by `npm run check:inline-module-scripts`.
            assetsInlineLimit: (file) =>
                file.endsWith('.js') ? false : undefined,
        },
    },
})
