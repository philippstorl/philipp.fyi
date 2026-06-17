import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
    test('has correct title and headline', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveTitle('Philipp Storl')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('I build things that last.')
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
