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

    test('Contact nav link leads to /contact/', async ({ page }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/contact/"]:visible').click()
        await expect(page).toHaveURL('/contact/')
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

    test('theme toggle works without loading React (issue #187)', async ({
        page,
    }) => {
        // Regression check: ThemeToggle used to be a client:load React
        // island (issue #187); only /contact/'s ContactForm should load JS.
        const jsRequests: string[] = []
        page.on('request', (req) => {
            if (req.url().endsWith('.js')) jsRequests.push(req.url())
        })

        await page.goto('/')
        await page.getByRole('button', { name: 'Light mode' }).click()
        await expect(page.locator('html')).not.toHaveClass(/dark/)
        await expect(
            page.getByRole('button', { name: 'Light mode' }),
        ).toHaveAttribute('aria-pressed', 'true')

        expect(jsRequests.some((url) => /\/client\./.test(url))).toBe(false)
    })

    test('system preference selection tracks a live OS theme change', async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'light' })
        await page.goto('/')
        await page.getByRole('button', { name: 'System preference' }).click()
        await expect(page.locator('html')).not.toHaveClass(/dark/)

        await page.emulateMedia({ colorScheme: 'dark' })
        await expect(page.locator('html')).toHaveClass(/dark/)

        // Live OS tracking stops once an explicit theme is picked.
        await page.getByRole('button', { name: 'Light mode' }).click()
        await page.emulateMedia({ colorScheme: 'light' })
        await expect(page.locator('html')).not.toHaveClass(/dark/)
        await page.emulateMedia({ colorScheme: 'dark' })
        await expect(page.locator('html')).not.toHaveClass(/dark/)
    })

    test('dark mode persists across client-side navigation', async ({
        page,
    }) => {
        await page.goto('/')

        await page.getByRole('button', { name: 'Dark mode' }).click()
        await expect(page.locator('html')).toHaveClass(/dark/)

        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/principles/"]:visible').click()
        await expect(page).toHaveURL('/principles/')
        await expect(page.locator('html')).toHaveClass(/dark/)
    })

    test('mobile nav closes on Escape and returns focus to the toggle', async ({
        page,
    }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )

        await mobileToggle.click()
        await expect(page.locator('#mobile-nav')).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(page.locator('#mobile-nav')).toBeHidden()
        await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
        await expect(mobileToggle).toBeFocused()
    })

    test('mobile nav closes when clicking outside it', async ({ page }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )

        await mobileToggle.click()
        await expect(page.locator('#mobile-nav')).toBeVisible()

        // A spot outside both the toggle and the open menu -- not a link, so
        // it doesn't also trigger a navigation.
        await page.locator('#main-content').click({ position: { x: 5, y: 5 } })
        await expect(page.locator('#mobile-nav')).toBeHidden()
        await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
    })

    test('skip link moves keyboard focus to main content', async ({ page }) => {
        await page.goto('/')
        await page.keyboard.press('Tab')
        await expect(page.getByText('Skip to main content')).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.locator('#main-content')).toBeFocused()
    })
})
