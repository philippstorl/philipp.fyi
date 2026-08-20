import { test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { pages, themes, resultFileName } from '../scripts/contrast-pages.mjs'

// Report-only color-contrast scan (issue #149). Never asserts/fails — it
// writes each page/theme's axe-core `color-contrast` violations to
// contrast-results/ for scripts/check-contrast.mjs to aggregate, filter
// against contrast-allowlist.json, and turn into a PR comment. Runs via its
// own `npm run test:contrast` / playwright.contrast.config.ts, not the
// regular `npm test`, so it can never gate the build. See CLAUDE.md.
//
// contrast-results/ is cleared once, up front, by
// e2e/contrast.global-setup.ts — not here — since that needs to happen
// exactly once before any worker starts, not once per worker.

const outDir = path.join(process.cwd(), 'contrast-results')

async function scanAndWrite(page: Page, reportedPath: string, theme: string) {
    const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze()

    fs.writeFileSync(
        path.join(outDir, resultFileName(reportedPath, theme)),
        JSON.stringify(
            { page: reportedPath, theme, violations: results.violations },
            null,
            2,
        ),
    )
}

test.describe('color contrast (report only)', () => {
    for (const { reportedPath, gotoPath } of pages) {
        for (const theme of themes) {
            test(`${reportedPath} - ${theme}`, async ({ page }) => {
                // The config-level `use.reducedMotion` option doesn't
                // reliably take effect for the actual page's matchMedia —
                // set it explicitly instead. See the comment on
                // playwright.contrast.config.ts's `use.reducedMotion`.
                await page.emulateMedia({ reducedMotion: 'reduce' })
                await page.addInitScript((t: string) => {
                    window.localStorage.setItem('theme', t)
                }, theme)
                await page.goto(gotoPath)
                await scanAndWrite(page, reportedPath, theme)
            })
        }
    }
})
