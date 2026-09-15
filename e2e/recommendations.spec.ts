import { test, expect } from '@playwright/test'

test.describe('Recommendations page', () => {
    test('shows all recommendations', async ({ page }) => {
        await page.goto('/recommendations/')
        const items = page.locator('ol li')
        await expect(items).toHaveCount(14)
    })

    test('intro paragraph has correct spacing around the LinkedIn link', async ({
        page,
    }) => {
        // Guards the exact whitespace-collapse spot compressHTML's mode
        // change (issue #297) is fragile around: a `{' '}` before the link
        // and zero-space text/tag boundaries around it and the comma after.
        await page.goto('/recommendations/')
        const intro = page.locator('p', { hasText: 'collected from' })
        await expect(intro).toHaveText(
            "Recommendations from colleagues, managers, direct reports, and external partners I've worked with over the years, collected from LinkedIn (opens in a new tab), unedited except for formatting.",
        )
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

    test('links to About, Principles, and Work', async ({ page }) => {
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

        await page.goto('/recommendations/')
        const workLink = page.locator('main a[href="/work/"]')
        await expect(workLink).toBeVisible()
        await workLink.click()
        await expect(page).toHaveURL('/work/')
    })
})
