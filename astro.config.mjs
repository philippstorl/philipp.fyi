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
        // Astro auto-hashes its own processed <script> tags for the CSP
        // allowlist, but not `is:inline` scripts (they bypass its pipeline
        // entirely). Header.astro's pre-hydration theme-correction script
        // needs to be `is:inline` for synchronous, pre-paint execution, so
        // its hash is registered here by hand. If that script's content
        // ever changes, recompute this hash (`openssl dgst -sha256 -binary
        // <file> | openssl base64`, over the exact text between the
        // <script>/</script> tags in the built dist/index.html) or the
        // script will be silently blocked by CSP in production — verify
        // with `npm run build && npx netlify serve` afterward, since this
        // only surfaces at runtime, never in `npm run lint`/`typecheck`.
        csp: {
            scriptDirective: {
                hashes: ['sha256-wVZRUouTil3YKZr+95pA0pv93LmFxrl+ODZY0y8QIQ4='],
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
