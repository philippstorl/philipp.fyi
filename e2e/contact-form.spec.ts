import { test, expect, type Page } from '@playwright/test'

// A pre-hydration click falls through to a real form POST/reload, wiping
// test state -- wait for the submit button's React fiber prop first.
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

    test('multi-field validation failure fires one summary alert, not three', async ({
        page,
    }) => {
        // Regression: 3 competing role="alert" regions used to fire at once.
        await gotoAndWaitForContactFormHydration(page)

        await page.locator('form[name="contact"] button[type="submit"]').click()

        await expect(page.getByRole('alert')).toHaveText(
            '3 fields need attention.',
        )
        await expect(page.locator('#contact-name-error')).not.toHaveAttribute(
            'role',
            'alert',
        )
        await expect(page.locator('#contact-email-error')).not.toHaveAttribute(
            'role',
            'alert',
        )
        await expect(
            page.locator('#contact-message-error'),
        ).not.toHaveAttribute('role', 'alert')
    })

    test('re-announces the summary alert when a second failed attempt has the same error count', async ({
        page,
    }) => {
        // Regression: same-count retry didn't remount role="alert" (no DOM
        // change to reconcile) -- marker below proves a remount now happens.
        await gotoAndWaitForContactFormHydration(page)

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-message').fill('Hello there')
        await page.locator('form[name="contact"] button[type="submit"]').click()
        await expect(page.getByRole('alert')).toHaveText(
            '1 field needs attention.',
        )

        await page.evaluate(() => {
            document
                .querySelector('[role="alert"]')
                ?.setAttribute('data-marker', 'first-attempt')
        })

        await page.locator('#contact-email').fill('test@example.com')
        await page.locator('#contact-name').fill('')
        await page.locator('form[name="contact"] button[type="submit"]').click()

        await expect(page.getByRole('alert')).toHaveText(
            '1 field needs attention.',
        )
        const marker = await page.evaluate(() =>
            document
                .querySelector('[role="alert"]')
                ?.getAttribute('data-marker'),
        )
        expect(marker).toBeNull()
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

    test('a field error clears as soon as the user corrects it', async ({
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

        await page.locator('#contact-name').fill('Test User')
        await expect(page.locator('#contact-name-error')).toBeHidden()
        // Correcting one field doesn't touch the others' still-stale errors.
        await expect(page.locator('#contact-email-error')).toHaveText(
            'Email is required.',
        )
    })

    test('correcting one field does not steal focus to another still-erroring field', async ({
        page,
    }) => {
        // Regression: clearing one error re-ran the submit-focus effect,
        // yanking focus to the next erroring field mid-correction.
        await gotoAndWaitForContactFormHydration(page)

        await page.locator('form[name="contact"] button[type="submit"]').click()
        await expect(page.locator('#contact-name')).toBeFocused()

        await page.locator('#contact-name').fill('Test User')
        await expect(page.locator('#contact-name')).toBeFocused()
    })

    test('an email error only clears once the email is actually valid, not just non-empty', async ({
        page,
    }) => {
        // Regression: error used to clear on any non-empty value, not a valid one.
        await gotoAndWaitForContactFormHydration(page)

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('not-an-email')
        await page.locator('#contact-message').fill('Hello there')
        await page.locator('form[name="contact"] button[type="submit"]').click()
        await expect(page.locator('#contact-email-error')).toHaveText(
            'Please enter a valid email address.',
        )

        await page.locator('#contact-email').fill('still-not-an-email')
        await expect(page.locator('#contact-email-error')).toHaveText(
            'Please enter a valid email address.',
        )

        await page.locator('#contact-email').fill('test@example.com')
        await expect(page.locator('#contact-email-error')).toBeHidden()
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
