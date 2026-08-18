import { test, expect, type Route } from '@playwright/test'

// ContactForm is a client:load React island. A submit-button click that
// lands before hydration attaches the onSubmit handler falls through to a
// real native form submission (method="POST", no action -> posts to the
// current URL), which would otherwise navigate the page away and wipe out
// the fields/state the test just set up. A 204 response to a navigation
// request is a no-op in Chromium (the current document stays as-is), so
// swallowing just the navigation case here turns that race into a safe
// retry via toPass() instead of a destructive reload.
function guardAgainstUnhydratedSubmit(
    mockResponse: (route: Route) => Promise<void>,
) {
    return (route: Route) => {
        const request = route.request()
        if (request.method() !== 'POST') return route.continue()
        if (request.isNavigationRequest()) {
            return route.fulfill({ status: 204, body: '' })
        }
        return mockResponse(route)
    }
}

test.describe('Contact form', () => {
    test('submitting with empty fields shows inline errors and focuses the first invalid field', async ({
        page,
    }) => {
        await page.goto('/')
        await page.route(
            '/',
            guardAgainstUnhydratedSubmit((route) => route.continue()),
        )

        await expect(async () => {
            await page.locator('#contact button[type="submit"]').click()
            await expect(page.locator('#contact-name-error')).toHaveText(
                'Name is required.',
            )
        }).toPass()

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
        await page.goto('/')
        await page.route(
            '/',
            guardAgainstUnhydratedSubmit((route) => route.continue()),
        )

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('not-an-email')
        await page.locator('#contact-message').fill('Hello there')

        await expect(async () => {
            await page.locator('#contact button[type="submit"]').click()
            await expect(page.locator('#contact-email-error')).toHaveText(
                'Please enter a valid email address.',
            )
        }).toPass()

        await expect(page.locator('#contact-email')).toBeFocused()
    })

    test('a failed submission shows the error banner', async ({ page }) => {
        await page.goto('/')
        await page.route(
            '/',
            guardAgainstUnhydratedSubmit((route) =>
                route.fulfill({ status: 500, body: 'error' }),
            ),
        )

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('test@example.com')
        await page.locator('#contact-message').fill('Hello there')

        await expect(async () => {
            await page.locator('#contact button[type="submit"]').click()
            await expect(page.getByRole('alert')).toHaveText(
                /Something went wrong/,
            )
        }).toPass()
    })

    test('a successful submission shows the success confirmation and moves focus to it', async ({
        page,
    }) => {
        await page.goto('/')
        await page.route(
            '/',
            guardAgainstUnhydratedSubmit((route) =>
                route.fulfill({ status: 200, body: 'ok' }),
            ),
        )

        await page.locator('#contact-name').fill('Test User')
        await page.locator('#contact-email').fill('test@example.com')
        await page.locator('#contact-message').fill('Hello there')

        const confirmation = page.getByRole('status').filter({
            hasText: 'Message sent.',
        })
        await expect(async () => {
            await page.locator('#contact button[type="submit"]').click()
            await expect(confirmation).toBeVisible()
        }).toPass()

        await expect(confirmation).toBeFocused()
    })
})
