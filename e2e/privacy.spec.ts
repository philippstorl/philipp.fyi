import { test, expect } from '@playwright/test'

test.describe('Privacy policy page', () => {
    test('shows heading and key GDPR disclosures', async ({ page }) => {
        await page.goto('/privacy/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Controller' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Your rights' }),
        ).toBeVisible()
    })

    test('links to the contact form', async ({ page }) => {
        await page.goto('/privacy/')
        const links = page.locator('article a[href="/contact/"]')
        await expect(links.first()).toBeVisible()
    })

    test('external links carry the correct href and a new-tab accessible-name suffix', async ({
        page,
    }) => {
        await page.goto('/privacy/')

        const netlifyLinks = page.locator(
            'article a[href="https://www.netlify.com/privacy/"]',
        )
        await expect(netlifyLinks).toHaveCount(2)
        for (const link of await netlifyLinks.all()) {
            await expect(link).toHaveAttribute('target', '_blank')
            await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
            await expect(link).toHaveAccessibleName(/opens in a new tab/)
        }

        const dpaLink = page.locator(
            'article a[href="https://www.datenschutz.sachsen.de/"]',
        )
        await expect(dpaLink).toHaveAttribute('target', '_blank')
        await expect(dpaLink).toHaveAccessibleName(/opens in a new tab/)
    })

    test('footer Privacy link leads to /privacy/', async ({ page }) => {
        await page.goto('/')
        // Dev toolbar overlay intercepts footer clicks on mobile -- assert href instead.
        await expect(
            page.locator('footer a', { hasText: 'Privacy' }),
        ).toHaveAttribute('href', '/privacy/')
    })
})
