import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
    test('header is sticky and shows name mark', async ({ page }) => {
        await page.goto('/')
        const header = page.locator('#site-header')
        await expect(header).toBeVisible()
        await expect(header.getByText('Philipp Storl')).toBeVisible()
    })

    test('Principles nav link leads to /principles/', async ({ page }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/principles/"]:visible').click()
        await expect(page).toHaveURL('/principles/')
    })

    test('logo/name mark navigates home', async ({ page }) => {
        await page.goto('/principles/')
        await page.click('#site-header a[href="/"]')
        await expect(page).toHaveURL('/')
    })

    test('theme toggle is visible', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('group')).toBeVisible()
    })

    test('dark mode persists across client-side navigation', async ({ page }) => {
        await page.goto('/')

        // The toggle is a client:load React island; retry the click in case
        // it lands before hydration attaches the handler.
        await expect(async () => {
            await page.getByRole('button', { name: 'Dark mode' }).click()
            await expect(page.locator('html')).toHaveClass(/dark/)
        }).toPass()

        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/principles/"]:visible').click()
        await expect(page).toHaveURL('/principles/')
        await expect(page.locator('html')).toHaveClass(/dark/)
    })
})
