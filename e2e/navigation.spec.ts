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
        // Header is transition:persist'ed -- active state must be recomputed on navigate.
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
        // island; only /contact/'s ContactForm should load JS.
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

    test('theme toggle buttons do not repeat their name as a description (issue #336)', async ({
        page,
        browserName,
    }) => {
        test.skip(browserName !== 'chromium', 'Reads the AX tree over CDP')
        // Reads Chromium's real AX tree: Playwright's own
        // toHaveAccessibleDescription always reports `title`, even when it
        // already supplied the name.
        await page.goto('/')
        const names = ['Light mode', 'System preference', 'Dark mode']
        const cdp = await page.context().newCDPSession(page)
        const { nodes } = await cdp.send('Accessibility.getFullAXTree')
        await cdp.detach()
        const buttons = nodes.filter(
            (node) =>
                node.role?.value === 'button' &&
                names.includes(String(node.name?.value)),
        )
        expect(buttons.map((node) => node.name?.value).sort()).toEqual(
            [...names].sort(),
        )
        for (const node of buttons) {
            expect(node.description?.value ?? '').toBe('')
        }
        for (const name of names) {
            await expect(
                page.getByRole('button', { name, exact: true }),
            ).toHaveAttribute('title', name)
        }
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

        // The backdrop, not page content, receives the "outside" click now.
        await page.locator('#mobile-nav-backdrop').click()
        await expect(page.locator('#mobile-nav')).toBeHidden()
        await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
    })

    test('mobile nav backdrop appears while the menu is open and disappears once it closes', async ({
        page,
    }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )

        const backdrop = page.locator('#mobile-nav-backdrop')
        await expect(backdrop).toBeHidden()

        await mobileToggle.click()
        await expect(backdrop).toBeVisible()

        await mobileToggle.click()
        await expect(backdrop).toBeHidden()
    })

    test('mobile nav keeps keyboard focus out of background content while open (issue #231)', async ({
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
        await expect(page.locator('#main-content')).toHaveAttribute('inert', '')
        await expect(page.locator('#site-footer')).toHaveAttribute('inert', '')

        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab')
            const escapedToBackground = await page.evaluate(() => {
                const el = document.activeElement
                if (!el) return false
                return (
                    !!el.closest('#skip-link') ||
                    !!el.closest('#main-content') ||
                    !!el.closest('#site-footer')
                )
            })
            expect(escapedToBackground).toBe(false)
        }

        await page.keyboard.press('Escape')
        await expect(page.locator('#main-content')).not.toHaveAttribute('inert')
        await expect(page.locator('#site-footer')).not.toHaveAttribute('inert')
    })

    test('mobile nav inert scoping still targets the live main/footer after a client-side navigation (issue #231)', async ({
        page,
    }) => {
        // Not transition:persist'ed -- a soft nav swaps in fresh nodes;
        // caching the originals would toggle inert on stale ones.
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )

        await mobileToggle.click()
        await page.locator('nav a[href="/about/"]:visible').click()
        await expect(page).toHaveURL('/about/')

        await mobileToggle.click()
        await expect(page.locator('#mobile-nav')).toBeVisible()
        await expect(page.locator('#main-content')).toHaveAttribute('inert', '')
        await expect(page.locator('#site-footer')).toHaveAttribute('inert', '')

        await page.keyboard.press('Escape')
        await expect(page.locator('#main-content')).not.toHaveAttribute('inert')
        await expect(page.locator('#site-footer')).not.toHaveAttribute('inert')
    })

    test('mobile nav closes when a client-side navigation swaps the page underneath it', async ({
        page,
    }) => {
        await page.goto('/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )

        await mobileToggle.click()
        await page.locator('nav a[href="/about/"]:visible').click()
        await expect(page).toHaveURL('/about/')

        await mobileToggle.click()
        await expect(page.locator('#mobile-nav')).toBeVisible()
        await page.goBack()
        await expect(page).toHaveURL('/')

        await expect(page.locator('#mobile-nav')).toBeHidden()
        await expect(page.locator('#main-content')).not.toHaveAttribute('inert')
        await expect(page.locator('#skip-link')).not.toHaveAttribute('inert')
    })

    test('reverse-tabbing never leaves the focused element hidden under the sticky header (issue #333)', async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/')
        await page.locator('#site-footer a').last().focus()

        const obscured: string[] = []
        for (let i = 0; i < 80; i++) {
            await page.keyboard.press('Shift+Tab')
            const result = await page.evaluate(() => {
                const el = document.activeElement
                const header = document.getElementById('site-header')
                if (!el || !header || el === document.body) return 'done'
                if (header.contains(el)) return 'done'
                const { bottom } = el.getBoundingClientRect()
                return bottom <= header.getBoundingClientRect().bottom
                    ? (el.textContent?.trim().slice(0, 40) ?? el.tagName)
                    : null
            })
            if (result === 'done') break
            if (result) obscured.push(result)
        }
        expect(obscured).toEqual([])
    })

    test('skip link moves keyboard focus to main content', async ({ page }) => {
        await page.goto('/')
        await page.keyboard.press('Tab')
        await expect(page.getByText('Skip to main content')).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.locator('#main-content')).toBeFocused()
    })

    test('skip link is unreachable while the mobile nav is open and works again once closed (issue #337)', async ({
        page,
    }) => {
        await page.goto('/about/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )
        const skipLink = page.locator('#skip-link')
        const logo = page.getByRole('link', { name: 'Philipp Storl, home' })

        await mobileToggle.click()
        await expect(skipLink).toHaveAttribute('inert', '')

        // Its target is inert while open, so activating it would strand focus on <body>.
        await logo.focus()
        await page.keyboard.press('Shift+Tab')
        const escapedToBackground = await page.evaluate(
            () =>
                !!document.activeElement?.closest(
                    '#skip-link, #main-content, #site-footer',
                ),
        )
        expect(escapedToBackground).toBe(false)

        await page.keyboard.press('Escape')
        await expect(skipLink).not.toHaveAttribute('inert')
        await logo.focus()
        await page.keyboard.press('Shift+Tab')
        await expect(skipLink).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.locator('#main-content')).toBeFocused()
    })
})
