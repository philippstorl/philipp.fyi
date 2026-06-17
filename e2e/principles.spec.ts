import { test, expect } from '@playwright/test'

test.describe('Principles page', () => {
    test('shows all 13 principles', async ({ page }) => {
        await page.goto('/principles')
        const items = page.locator('ol li')
        await expect(items).toHaveCount(13)
    })

    test('first principle is numbered 01', async ({ page }) => {
        await page.goto('/principles')
        const firstNumber = page.locator('ol li').first().locator('.font-mono').first()
        await expect(firstNumber).toContainText('01')
    })

    test('last principle is numbered 13', async ({ page }) => {
        await page.goto('/principles')
        const lastNumber = page.locator('ol li').last().locator('.font-mono').first()
        await expect(lastNumber).toContainText('13')
    })

    test('"How I work" CTA on home links to /principles', async ({ page }) => {
        await page.goto('/')
        const link = page.locator('#principles a[href="/principles"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/principles')
    })
})
