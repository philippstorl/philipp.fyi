import { chromium, type FullConfig } from '@playwright/test'
import { pages } from '../../scripts/contrast-pages.mjs'

// Playwright's webServer readiness check is a plain HTTP fetch, so Vite's
// dependency optimizer still discovers deps (islands, page scripts) on the
// first real browser visit and sends a full reload over HMR, destroying any
// in-flight page.evaluate() ("Execution context was destroyed"; axe scans hit
// it). Visiting every page once lets the optimizer settle before workers start.
// Best-effort: a failed visit only warns, so it can't block the whole run.
export async function warmDevServer(config: FullConfig) {
    const baseURL = config.projects[0]?.use.baseURL
    if (!baseURL) throw new Error('warmDevServer: no baseURL in config')
    const browser = await chromium.launch()
    try {
        const results = await Promise.allSettled(
            pages.map(async ({ gotoPath }) => {
                const page = await browser.newPage()
                await page.goto(new URL(gotoPath, baseURL).href, {
                    waitUntil: 'networkidle',
                })
            }),
        )
        for (const result of results) {
            if (result.status === 'rejected') {
                console.warn('Dev server warmup visit failed:', result.reason)
            }
        }
    } finally {
        await browser.close()
    }
}
