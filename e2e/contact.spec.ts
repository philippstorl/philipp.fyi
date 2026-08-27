import { test, expect } from '@playwright/test'

test.describe('Contact page', () => {
    test('shows heading and the contact form', async ({ page }) => {
        await page.goto('/contact/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'Contact' }),
        ).toBeVisible()
        await expect(
            page.locator('form[name="contact"]:not([hidden])'),
        ).toBeVisible()
    })

    test('links to LinkedIn and GitHub', async ({ page }) => {
        await page.goto('/contact/')

        await expect(
            page.getByRole('link', { name: 'Connect on LinkedIn' }),
        ).toHaveAttribute('href', 'https://www.linkedin.com/in/philipp-storl/')
        await expect(
            page.getByRole('link', { name: 'Browse my code on GitHub' }),
        ).toHaveAttribute('href', 'https://github.com/philippstorl')
    })

    test('"Send me a message" CTA on home links to /contact/', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page.locator('#contact a[href="/contact/"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/contact/')
    })

    test('footer mail icon links to /contact/', async ({ page }) => {
        // Dev toolbar overlay intercepts footer clicks on mobile -- assert href instead.
        await page.goto('/')
        await expect(
            page.locator('footer a[aria-label="Contact"]'),
        ).toHaveAttribute('href', '/contact/')
    })
})
