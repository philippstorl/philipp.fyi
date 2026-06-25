import { test, expect } from '@playwright/test'

test.describe('404 page', () => {
    test('unknown route serves the 404 page', async ({ page }) => {
        const response = await page.goto('/this-page-does-not-exist/')
        // Netlify serves the 404.html with a 404 status
        expect(response?.status()).toBe(404)
    })

    test('404 page has the expected headline', async ({ page }) => {
        await page.goto('/this-page-does-not-exist/', {
            waitUntil: 'domcontentloaded',
        })
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'This page took the wave.',
        )
    })

    test('back home link on 404 works', async ({ page }) => {
        await page.goto('/this-page-does-not-exist/', {
            waitUntil: 'domcontentloaded',
        })
        await page.click('text=← Back home')
        await expect(page).toHaveURL('/')
    })
})
