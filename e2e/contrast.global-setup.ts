import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

// Runs once in the main process, unlike beforeAll (once per worker) --
// avoids two workers racing to wipe/recreate contrast-results/.
export default async function globalSetup() {
    const outDir = path.join(process.cwd(), 'contrast-results')
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(outDir, { recursive: true })

    // Playwright's webServer readiness check is a plain HTTP fetch, which
    // never executes client-side JS -- so Vite's dependency optimizer can
    // still discover new deps (islands, icon imports, etc.) on the *first*
    // real browser navigation. When that happens mid-request, Vite sends a
    // full-reload over its HMR websocket, destroying whatever page.evaluate()
    // is in flight -- deterministically hitting "/" (the heaviest page, and
    // first in contrast-pages.mjs) with "Execution context was destroyed".
    // One real navigation here lets the optimizer settle before the parallel
    // test workers start.
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' })
    await browser.close()
}
