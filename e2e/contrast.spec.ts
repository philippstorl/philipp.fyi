import { test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { pages, themes, resultFileName } from '../scripts/contrast-pages.mjs'

// Report-only axe scan; check-contrast.mjs aggregates (own runner, not
// `npm test` -- CLAUDE.md). contrast-results/ cleared by global-setup.ts, not here.

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
                // Config's reducedMotion doesn't reach matchMedia — set explicitly.
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
