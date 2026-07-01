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

    test('shows all 4 work cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#work article')
        await expect(cards).toHaveCount(4)
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

    test('contact section is present', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('#contact')).toBeVisible()
    })
})
