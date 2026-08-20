import { test, expect, type Page } from '@playwright/test'

// ContactForm is a client:load React island on the dedicated /contact/
// page -- hydration still isn't synchronous with paint, so a click that
// lands before React actually attaches the onSubmit handler falls through
// to a real native form submission (method="POST", no action -> posts to
// and reloads the current page), which would otherwise navigate the page
// away and wipe out the fields/state the test just set up. So every test
// here waits for a positive, verifiable signal that hydration has
// completed -- the submit button carrying a React fiber property -- before
// ever interacting with the form, rather than reacting to failures after
// the fact.
async function gotoAndWaitForContactFormHydration(page: Page) {
    await page.goto('/contact/')
    await page.waitForFunction(() => {
        const button = document.querySelector(
            'form[name="contact"] button[type="submit"]',
        )
        return (
            !!button &&
            Object.keys(button).some((key) => key.startsWith('__reactProps'))
        )
    })
}

test.describe('Contact form', () => {
    test('submitting with empty fields shows inline errors and focuses the first invalid field', async ({
        page,
    }) => {
        await gotoAndWaitForContactFormHydration(page)

        await page.locator('form[name="contact"] button[type="submit"]').click()

        await expect(page.locator('#contact-name-error')).toHaveText(
            'Name is required.',
        )
        await expect(page.locator('#contact-email-error')).toHaveText(
            'Email is required.',
        )
        await expect(page.locator('#contact-message-error')).toHaveText(
            'Message is required.',
        )
        await expect(page.locator('#contact-name')).toBeFocused()
    })

    test('an invalid email shows a validation error instead of "required"', async ({
        page,
    }) => {
        await gotoAndWaitForContactFormHydration(page)

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('not-an-email')
        await page.locator('#contact-message').fill('Hello there')
        await page.locator('form[name="contact"] button[type="submit"]').click()

        await expect(page.locator('#contact-email-error')).toHaveText(
            'Please enter a valid email address.',
        )
        await expect(page.locator('#contact-email')).toBeFocused()
    })

    test('a failed submission shows the error banner', async ({ page }) => {
        await gotoAndWaitForContactFormHydration(page)
        await page.route('/', (route) =>
            route.request().method() === 'POST'
                ? route.fulfill({ status: 500, body: 'error' })
                : route.continue(),
        )

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('test@example.com')
        await page.locator('#contact-message').fill('Hello there')
        await page.locator('form[name="contact"] button[type="submit"]').click()

        await expect(
            page.getByRole('alert').filter({ hasText: 'Something went wrong' }),
        ).toBeVisible()
    })

    test('a successful submission shows the success confirmation and moves focus to it', async ({
        page,
    }) => {
        await gotoAndWaitForContactFormHydration(page)
        await page.route('/', (route) =>
            route.request().method() === 'POST'
                ? route.fulfill({ status: 200, body: 'ok' })
                : route.continue(),
        )

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('test@example.com')
        await page.locator('#contact-message').fill('Hello there')
        await page.locator('form[name="contact"] button[type="submit"]').click()

        const confirmation = page.getByRole('status').filter({
            hasText: 'Message sent.',
        })
        await expect(confirmation).toBeVisible()
        await expect(confirmation).toBeFocused()
    })
})
