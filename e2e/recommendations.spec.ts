import { test, expect } from '@playwright/test'

test.describe('Recommendations page', () => {
    test('shows all recommendations', async ({ page }) => {
        await page.goto('/recommendations/')
        const items = page.locator('ol li')
        await expect(items).toHaveCount(14)
    })

    test('"What others say" CTA on home links to /recommendations/', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page.locator(
            '#recommendations a[href="/recommendations/"]',
        )
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/recommendations/')
    })
})
