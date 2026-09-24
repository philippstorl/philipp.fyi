import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
    test('has correct title and headline', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveTitle('Philipp Storl')
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'I build things that last.',
        )
    })

    test('shows availability badge', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('Open to new opportunities')).toBeVisible()
    })

    test('og:type is website, not article', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
            'content',
            'website',
        )
    })

    test('shows all 4 work cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#work article')
        await expect(cards).toHaveCount(4)
    })

    test('"See all work" CTA on home links to /work/', async ({ page }) => {
        await page.goto('/')
        const link = page.locator('#work a[href="/work/"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/work/')
    })

    test('non-featured cards with a cover image show a screenshot', async ({
        page,
    }) => {
        await page.goto('/')
        const withCover = page
            .locator('#work article')
            .filter({ hasText: '8 years of brand evolution on staffbase.com' })
        await expect(withCover.locator('img')).toBeVisible()
    })

    test('shows 6 principle cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#principles article')
        await expect(cards).toHaveCount(6)
    })

    test('shows 6 recommendation cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#recommendations article')
        await expect(cards).toHaveCount(6)
    })

    test('recommendation names are not clipped at 320px', async ({ page }) => {
        // WCAG 1.4.10 reflow width; the name is a quote's attribution.
        await page.setViewportSize({ width: 320, height: 800 })
        await page.goto('/')
        // Mobile emulation widens the layout viewport if anything overflows.
        expect(
            await page.evaluate(() => document.documentElement.clientWidth),
        ).toBe(320)
        await page.evaluate(async () => {
            await document.fonts.ready
        })
        const names = page.locator('#recommendations article h3')
        await expect(names).toHaveCount(6)
        const clipped = await names.evaluateAll((headings) =>
            headings
                .filter((h) => h.scrollWidth > h.clientWidth)
                .map((h) => h.textContent?.trim()),
        )
        expect(clipped).toEqual([])
    })

    test('card grids are exposed as ordered lists', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('#work ol > li > article')).toHaveCount(4)
        await expect(page.locator('#principles ol > li > article')).toHaveCount(
            6,
        )
        await expect(
            page.locator('#recommendations ol > li > article'),
        ).toHaveCount(6)
    })

    test('has no horizontal overflow', async ({ page }) => {
        // A list item wrapper without grid-cols-1 lets truncated card text
        // widen the page past the mobile viewport. Compare against the
        // configured viewport: mobile emulation grows innerWidth to fit.
        await page.goto('/')
        const scrollWidth = await page.evaluate(
            () => document.documentElement.scrollWidth,
        )
        expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width)
    })

    test('contact section is present', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('#contact')).toBeVisible()
    })
})
