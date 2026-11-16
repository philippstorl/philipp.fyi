import type { Page } from '@playwright/test'

// /contact/ also renders a hidden Netlify detection form named "contact".
export const CONTACT_FORM_SELECTOR =
    'form[name="contact"]:has(button[type="submit"])'

export const CONTACT_SUBMIT_SELECTOR = `${CONTACT_FORM_SELECTOR} button[type="submit"]`

// A pre-hydration click falls through to native validation and a real form
// POST/reload, wiping test state. Wait for the submit button's React fiber
// prop and for the post-hydration noValidate, which hands validation to React.
export async function gotoAndWaitForContactFormHydration(page: Page) {
    await page.goto('/contact/')
    await waitForContactFormHydration(page)
}

// For a /contact/ reached by client-side navigation instead of page.goto().
export async function waitForContactFormHydration(page: Page) {
    await page.waitForFunction(
        ({ formSelector, submitSelector }) => {
            const form = document.querySelector<HTMLFormElement>(formSelector)
            const button = document.querySelector(submitSelector)
            return (
                !!form?.noValidate &&
                !!button &&
                Object.keys(button).some((key) =>
                    key.startsWith('__reactProps'),
                )
            )
        },
        {
            formSelector: CONTACT_FORM_SELECTOR,
            submitSelector: CONTACT_SUBMIT_SELECTOR,
        },
    )
}
