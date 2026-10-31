import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { pages } from '../scripts/contrast-pages.mjs'
import { NEW_TAB_SUFFIX } from '../src/utils/a11y'

// Blocking axe scan of every page (issue #519). Contrast is left to the
// report-only contrast job and its allowlist. `best-practice` holds the
// skip-link/region rules that catch a page missing <Main>.
for (const { reportedPath, gotoPath } of pages) {
    test(`${reportedPath} has no axe violations`, async ({ page }) => {
        // Scan the settled page, not Hero's entrance fade mid-animation.
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(gotoPath)
        const results = await new AxeBuilder({ page })
            .withTags([
                'wcag2a',
                'wcag2aa',
                'wcag21a',
                'wcag21aa',
                'wcag22aa',
                'best-practice',
            ])
            .disableRules(['color-contrast', 'color-contrast-enhanced'])
            .exclude('astro-dev-toolbar')
            .analyze()
        const violations = results.violations.map(({ id, nodes }) => ({
            rule: id,
            targets: nodes.map(({ target }) => target.join(' ')),
        }))
        expect(violations).toEqual([])
    })
}

const endsWithNewTabSuffix = new RegExp(
    `${NEW_TAB_SUFFIX.trim().replace(/[()]/g, '\\$&')}$`,
)

// Scoped to page landmarks so shadow-piercing CSS skips the dev toolbar's links.
for (const { reportedPath, gotoPath } of pages) {
    test(`${reportedPath} names every new-tab link as opening in a new tab`, async ({
        page,
    }) => {
        await page.goto(gotoPath)
        const links = page.locator(
            ':is(#site-header, main, footer) a[target="_blank"]',
        )
        // The footer's social links are on every page.
        expect(await links.count()).toBeGreaterThan(0)
        for (const link of await links.all()) {
            await expect(link).toHaveAccessibleName(endsWithNewTabSuffix)
        }
    })
}
