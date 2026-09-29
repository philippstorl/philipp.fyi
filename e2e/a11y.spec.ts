import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { pages } from '../scripts/contrast-pages.mjs'

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
