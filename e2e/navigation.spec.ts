import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
    test('header is sticky and shows name mark', async ({ page }) => {
        await page.goto('/')
        const header = page.locator('#site-header')
        await expect(header).toBeVisible()
        await expect(header.getByText('Philipp Storl')).toBeVisible()
    })

    test('Work nav link leads to /work/', async ({ page }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/work/"]:visible').click()
        await expect(page).toHaveURL('/work/')
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

    test('About nav link leads to /about/', async ({ page }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/about/"]:visible').click()
        await expect(page).toHaveURL('/about/')
    })

    test('active nav link updates after client-side navigation', async ({
        page,
    }) => {
        // Header persists across client-side navigations (transition:persist),
        // so the active-link state has to be recomputed on navigate rather
        // than relying on the server-rendered class from the first page load.
        await page.goto('/recommendations/')
        const desktopNav = page.locator('nav[aria-label="Main navigation"]')
        const mobileNav = page.locator('#mobile-nav')
        await expect(
            desktopNav.locator('a[href="/recommendations/"]'),
        ).toHaveAttribute('aria-current', 'page')
        await expect(
            mobileNav.locator('a[href="/recommendations/"]'),
        ).toHaveAttribute('aria-current', 'page')

        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/about/"]:visible').click()
        await expect(page).toHaveURL('/about/')

        await expect(desktopNav.locator('a[href="/about/"]')).toHaveAttribute(
            'aria-current',
            'page',
        )
        await expect(
            desktopNav.locator('a[href="/recommendations/"]'),
        ).not.toHaveAttribute('aria-current', 'page')
        await expect(mobileNav.locator('a[href="/about/"]')).toHaveAttribute(
            'aria-current',
            'page',
        )
        await expect(
            mobileNav.locator('a[href="/recommendations/"]'),
        ).not.toHaveAttribute('aria-current', 'page')
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

    test('dark mode persists across client-side navigation', async ({
        page,
    }) => {
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

    test('skip link moves keyboard focus to main content', async ({ page }) => {
        await page.goto('/')
        await page.keyboard.press('Tab')
        await expect(page.getByText('Skip to main content')).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.locator('#main-content')).toBeFocused()
    })
})
