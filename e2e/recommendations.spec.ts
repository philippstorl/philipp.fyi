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

    test('links to About and Principles', async ({ page }) => {
        await page.goto('/recommendations/')

        const aboutLink = page.locator('main a[href="/about/"]')
        await expect(aboutLink).toBeVisible()
        await aboutLink.click()
        await expect(page).toHaveURL('/about/')

        await page.goto('/recommendations/')
        const principlesLink = page.locator('main a[href="/principles/"]')
        await expect(principlesLink).toBeVisible()
        await principlesLink.click()
        await expect(page).toHaveURL('/principles/')
    })
})
