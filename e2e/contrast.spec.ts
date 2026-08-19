import { test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

// Report-only color-contrast scan (issue #149). Never asserts/fails — it
// writes each page/theme's axe-core `color-contrast` violations to
// contrast-results/ for scripts/check-contrast.mjs to aggregate, filter
// against contrast-allowlist.json, and turn into a PR comment. Runs via its
// own `npm run test:contrast` / playwright.contrast.config.ts, not the
// regular `npm test`, so it can never gate the build. See CLAUDE.md.

// Mirrors the page set the rest of e2e/ already exercises (see the goto()
// calls across e2e/*.spec.ts) rather than inventing a separate route list.
const pages = [
    '/',
    '/about/',
    '/principles/',
    '/recommendations/',
    '/work/',
    '/work/brand-evolution/',
    '/work/leadership-operating-model/',
    '/work/storyblok-migration/',
    '/work/voices-conference-website/',
]

const themes = ['light', 'dark'] as const

const outDir = path.join(process.cwd(), 'contrast-results')

async function scanAndWrite(
    page: Page,
    reportKey: string,
    pagePath: string,
    theme: string,
) {
    const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze()

    fs.mkdirSync(outDir, { recursive: true })
    const safeName = reportKey.replace(/[^a-z0-9_-]/gi, '_')
    fs.writeFileSync(
        path.join(outDir, `${safeName}.json`),
        JSON.stringify(
            { page: pagePath, theme, violations: results.violations },
            null,
            2,
        ),
    )
}

test.describe('color contrast (report only)', () => {
    for (const pagePath of pages) {
        for (const theme of themes) {
            test(`${pagePath} - ${theme}`, async ({ page }) => {
                // The config-level `use.reducedMotion` option doesn't
                // reliably take effect for the actual page's matchMedia —
                // set it explicitly instead. See the comment on
                // playwright.contrast.config.ts's `use.reducedMotion`.
                await page.emulateMedia({ reducedMotion: 'reduce' })
                await page.addInitScript((t: string) => {
                    window.localStorage.setItem('theme', t)
                }, theme)
                await page.goto(pagePath)
                await scanAndWrite(
                    page,
                    `${pagePath}__${theme}`,
                    pagePath,
                    theme,
                )
            })
        }
    }

    test('404 page', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(() => {
            window.localStorage.setItem('theme', 'light')
        })
        // Same nonexistent-route convention as e2e/404.spec.ts.
        await page.goto('/this-page-does-not-exist/')
        await scanAndWrite(page, '404__light', '/404', 'light')
    })
})
