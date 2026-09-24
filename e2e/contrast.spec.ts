import { test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { pages, themes, resultFileName } from '../scripts/contrast-pages.mjs'

// Report-only axe scan; check-contrast.mjs aggregates (own runner, not
// `npm test` -- CLAUDE.md). contrast-results/ cleared by global-setup.ts, not here.

const outDir = path.join(process.cwd(), 'contrast-results')

// axe can't parse a `none` color channel (Tailwind's neutral palette, incl.
// Typography's prose colors) and skips those nodes as `incomplete`. Outside
// interpolation `none` means 0 (CSS Color 4), so pinning it is render-identical.
async function normalizeNoneColorChannels(page: Page) {
    await page.evaluate(() => {
        // Read everything before writing, so each write doesn't force a restyle.
        const pins: [HTMLElement | SVGElement, string, string][] = []
        for (const el of document.querySelectorAll('*')) {
            if (!(el instanceof HTMLElement || el instanceof SVGElement))
                continue
            const style = getComputedStyle(el)
            for (const prop of ['color', 'background-color']) {
                const value = style.getPropertyValue(prop)
                if (/\bnone\b/.test(value)) {
                    pins.push([el, prop, value.replace(/\bnone\b/g, '0')])
                }
            }
        }
        for (const [el, prop, value] of pins) {
            el.style.setProperty(prop, value, 'important')
        }
    })
}

async function scanAndWrite(page: Page, reportedPath: string, theme: string) {
    await normalizeNoneColorChannels(page)
    const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze()

    fs.writeFileSync(
        path.join(outDir, resultFileName(reportedPath, theme)),
        JSON.stringify(
            {
                page: reportedPath,
                theme,
                violations: results.violations,
                incomplete: results.incomplete,
            },
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
