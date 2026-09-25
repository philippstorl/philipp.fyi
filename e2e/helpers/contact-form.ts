import type { Page } from '@playwright/test'

export const CONTACT_SUBMIT_SELECTOR =
    'form[name="contact"] button[type="submit"]'

// A pre-hydration click falls through to a real form POST/reload, wiping
// test state -- wait for the submit button's React fiber prop first.
export async function gotoAndWaitForContactFormHydration(page: Page) {
    await page.goto('/contact/')
    await page.waitForFunction((selector) => {
        const button = document.querySelector(selector)
        return (
            !!button &&
            Object.keys(button).some((key) => key.startsWith('__reactProps'))
        )
    }, CONTACT_SUBMIT_SELECTOR)
}
