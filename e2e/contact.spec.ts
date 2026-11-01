import { test, expect, type Locator } from '@playwright/test'

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

// Outline pill buttons meet the site's 44px touch target (issue #497).
test.describe('Pill button touch targets', () => {
    async function expectTouchTargetHeight(link: Locator) {
        await expect(link).toBeVisible()
        const box = await link.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
    }

    for (const { path, names } of [
        { path: '/', names: ['LinkedIn', 'GitHub'] },
        {
            path: '/contact/',
            names: ['Connect on LinkedIn', 'Browse my code on GitHub'],
        },
    ]) {
        test(`pill buttons on ${path} are at least 44px tall`, async ({
            page,
        }) => {
            await page.goto(path)
            for (const name of names) {
                await expectTouchTargetHeight(
                    page.locator('#main-content').getByRole('link', {
                        name: `${name} (opens in a new tab)`,
                        exact: true,
                    }),
                )
            }
        })
    }

    test('404 "Back home" pill button is at least 44px tall', async ({
        page,
    }) => {
        await page.goto('/this-page-does-not-exist/', {
            waitUntil: 'domcontentloaded',
        })
        await expectTouchTargetHeight(
            page
                .locator('#main-content')
                .getByRole('link', { name: '← Back home', exact: true }),
        )
    })
})
