import { test, expect } from '@playwright/test'
import { navItems } from '../src/data/navigation'

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
        ).not.toHaveAttribute('aria-current')
        await expect(mobileNav.locator('a[href="/about/"]')).toHaveAttribute(
            'aria-current',
            'page',
        )
        await expect(
            mobileNav.locator('a[href="/recommendations/"]'),
        ).not.toHaveAttribute('aria-current')
    })

    test('Work nav link is aria-current="true" inside the section, "page" on /work/ (issue #341)', async ({
        page,
    }) => {
        const desktopWork = page.locator(
            'nav[aria-label="Main navigation"] a[href="/work/"]',
        )
        const mobileWork = page.locator('#mobile-nav a[href="/work/"]')

        // Raw HTML, since updateActiveNav() rewrites the attribute on load.
        const html = await (
            await page.request.get('/work/brand-evolution/')
        ).text()
        const serverWorkLinks =
            html.match(/<a href="\/work\/"[^>]*data-nav-link[^>]*>/g) ?? []
        expect(serverWorkLinks).toHaveLength(2)
        for (const tag of serverWorkLinks) {
            expect(tag).toContain('aria-current="true"')
        }

        await page.goto('/work/brand-evolution/')
        await expect(desktopWork).toHaveAttribute('aria-current', 'true')
        await expect(mobileWork).toHaveAttribute('aria-current', 'true')

        // Client-side updates across soft navigations (header is persisted).
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/work/"]:visible').click()
        await expect(page).toHaveURL('/work/')
        await expect(desktopWork).toHaveAttribute('aria-current', 'page')
        await expect(mobileWork).toHaveAttribute('aria-current', 'page')

        await page.locator('a[href="/work/storyblok-migration/"]').click()
        await expect(page).toHaveURL('/work/storyblok-migration/')
        await expect(desktopWork).toHaveAttribute('aria-current', 'true')
        await expect(mobileWork).toHaveAttribute('aria-current', 'true')

        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/about/"]:visible').click()
        await expect(page).toHaveURL('/about/')
        await expect(desktopWork).not.toHaveAttribute('aria-current')
        await expect(mobileWork).not.toHaveAttribute('aria-current')
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

    test('an unknown stored theme value follows the OS like System and gets cleared (issue #448)', async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'dark' })
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'system')
        })
        await page.goto('/')

        await expect(page.locator('html')).toHaveClass(/dark/)
        await expect(
            page.getByRole('button', { name: 'System preference' }),
        ).toHaveAttribute('aria-pressed', 'true')
        expect(
            await page.evaluate(() => localStorage.getItem('theme')),
        ).toBeNull()
    })

    test('pressed theme button styling follows aria-pressed alone (issue #449)', async ({
        page,
    }) => {
        await page.goto('/')
        const readStyles = () =>
            page.evaluate(() => {
                const resolve = (value: string) => {
                    const probe = document.createElement('div')
                    probe.style.color = value
                    document.body.append(probe)
                    const color = getComputedStyle(probe).color
                    probe.remove()
                    return color
                }
                const accent = resolve('var(--color-accent)')
                const muted = resolve('var(--color-muted)')
                return [...document.querySelectorAll('[data-theme-value]')].map(
                    (btn) => {
                        const style = getComputedStyle(btn)
                        const pressed =
                            btn.getAttribute('aria-pressed') === 'true'
                        return pressed
                            ? style.color === accent &&
                                  style.backgroundColor !== 'rgba(0, 0, 0, 0)'
                            : style.color === muted &&
                                  style.backgroundColor === 'rgba(0, 0, 0, 0)'
                    },
                )
            })

        // Covers both the pre-paint script's and the click handler's state.
        await expect.poll(readStyles).toEqual([true, true, true])
        await page.getByRole('button', { name: 'Dark mode' }).click()
        await page.mouse.move(0, 0)
        await expect.poll(readStyles).toEqual([true, true, true])
    })

    test('active nav link and pressed theme button keep a visible cue in forced-colors mode (issue #420)', async ({
        page,
    }) => {
        await page.emulateMedia({ forcedColors: 'active' })
        // No click: the pre-paint script already presses "System preference",
        // and a click would leave the pointer hovering the button under test.
        await page.goto('/work/')

        // Forced colors repaints non-system colors to Canvas, so the cues
        // only survive if they resolve to the system colors themselves.
        await expect
            .poll(() =>
                page.evaluate(() => {
                    const resolve = (systemColor: string) => {
                        const probe = document.createElement('div')
                        probe.style.backgroundColor = systemColor
                        document.body.append(probe)
                        const value = getComputedStyle(probe).backgroundColor
                        probe.remove()
                        return value
                    }
                    const canvasText = resolve('CanvasText')
                    const highlight = resolve('Highlight')
                    const highlightText = resolve('HighlightText')
                    const underlines = [
                        ...document.querySelectorAll(
                            'a[data-nav-link][aria-current]',
                        ),
                    ].map((a) => getComputedStyle(a, '::after'))
                    const pressed = document.querySelector(
                        '[data-theme-value][aria-pressed="true"]',
                    )
                    if (!pressed) return null
                    const pressedStyle = getComputedStyle(pressed)
                    return {
                        underline:
                            underlines.length > 0 &&
                            underlines.every(
                                (u) =>
                                    u.backgroundColor === canvasText &&
                                    parseFloat(u.width) > 0 &&
                                    parseFloat(u.height) > 0,
                            ),
                        pressedBackground:
                            pressedStyle.backgroundColor === highlight,
                        pressedText: pressedStyle.color === highlightText,
                    }
                }),
            )
            .toEqual({
                underline: true,
                pressedBackground: true,
                pressedText: true,
            })
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

    test('theme still applies and toggles when localStorage is blocked (issue #398)', async ({
        page,
    }) => {
        // Mimics a "block all site data" browser setting.
        await page.addInitScript(() => {
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                get() {
                    throw new DOMException('Storage blocked', 'SecurityError')
                },
            })
        })

        await page.emulateMedia({ colorScheme: 'dark' })
        await page.goto('/')
        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)
        await expect(
            page.getByRole('button', { name: 'System preference' }),
        ).toHaveAttribute('aria-pressed', 'true')

        await page.getByRole('button', { name: 'Light mode' }).click()
        await expect(html).not.toHaveClass(/dark/)
        await expect(
            page.getByRole('button', { name: 'Light mode' }),
        ).toHaveAttribute('aria-pressed', 'true')

        // The unsaved choice must survive a client-side navigation too.
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/principles/"]:visible').click()
        await expect(page).toHaveURL('/principles/')
        await expect(html).not.toHaveClass(/dark/)
    })

    test('an unsaved theme choice outlives a stale stored one when only writes fail (issue #398)', async ({
        page,
    }) => {
        // Reads still work, so BaseLayout's after-swap reapplies the stale 'dark'.
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'dark')
            const fail = () => {
                throw new DOMException('Quota exceeded', 'QuotaExceededError')
            }
            Storage.prototype.setItem = fail
            Storage.prototype.removeItem = fail
        })

        await page.emulateMedia({ colorScheme: 'light' })
        await page.goto('/')
        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)

        await page.getByRole('button', { name: 'Light mode' }).click()
        await expect(html).not.toHaveClass(/dark/)

        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/principles/"]:visible').click()
        await expect(page).toHaveURL('/principles/')
        await expect(html).not.toHaveClass(/dark/)
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

    test('opening and closing the mobile nav leaves a scrolled page where it was (issue #453)', async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/about/')
        const mobileToggle = page.locator('#nav-toggle')
        test.skip(
            !(await mobileToggle.isVisible()),
            'mobile-only nav toggle not visible on this viewport',
        )
        const scrollY = () => page.evaluate(() => window.scrollY)
        await page.evaluate(() => window.scrollTo(0, 500))
        expect(await scrollY()).toBe(500)

        // locator.click() scrolls the toggle into view before clicking.
        await mobileToggle.click()
        await expect(page.locator('#mobile-nav')).toBeVisible()
        expect(await scrollY()).toBe(500)

        await page.keyboard.press('Tab')
        await expect(page.locator('#mobile-nav a').first()).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(mobileToggle).toBeFocused()
        expect(await scrollY()).toBe(500)
    })

    test('tabbing into the sticky header leaves a scrolled page where it was (issue #453)', async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/about/')
        await page.evaluate(() => window.scrollTo(0, 500))
        await page
            .locator('#site-header a')
            .first()
            .evaluate((el: HTMLElement) => el.focus({ preventScroll: true }))

        await page.keyboard.press('Tab')
        expect(
            await page.evaluate(() =>
                document
                    .getElementById('site-header')
                    ?.contains(document.activeElement),
            ),
        ).toBe(true)
        expect(await page.evaluate(() => window.scrollY)).toBe(500)
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

    test('mobile nav scrolls its last link into view on a short viewport while the page stays locked (issue #388)', async ({
        page,
    }) => {
        // 400% zoom of 1280×1024.
        await page.setViewportSize({ width: 320, height: 256 })
        await page.goto('/about/')
        await page.locator('#nav-toggle').focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('#mobile-nav')).toBeVisible()

        const contact = page.locator('#mobile-nav a[href="/contact/"]')
        for (let i = 0; i < 10; i++) {
            if (await contact.evaluate((el) => el === document.activeElement))
                break
            await page.keyboard.press('Tab')
        }
        await expect(contact).toBeFocused()

        const header = await page.locator('#site-header').boundingBox()
        const link = await contact.boundingBox()
        expect(header).not.toBeNull()
        expect(link).not.toBeNull()
        if (!header || !link) return
        expect(link.y).toBeGreaterThanOrEqual(header.y + header.height)
        expect(link.y + link.height).toBeLessThanOrEqual(256)
        expect(await page.evaluate(() => window.scrollY)).toBe(0)

        await page.keyboard.press('Enter')
        await expect(page).toHaveURL('/contact/')
    })

    test('header logo and its focus ring stay clear of the theme toggle at 320px (issue #390)', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 320, height: 640 })
        await page.goto('/')
        // Fallback-font metrics would wrap the logo regardless of the layout.
        await page.evaluate(() => document.fonts.ready)
        const logo = page.getByRole('link', { name: 'Philipp Storl, home' })
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await expect(logo).toBeFocused()

        const toggle = await page
            .getByRole('group', { name: 'Color theme' })
            .boundingBox()
        expect(toggle).not.toBeNull()
        if (!toggle) return

        const layout = await logo.evaluate((el) => {
            const rect = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            return {
                logoRight: rect.right,
                logoWidth: rect.width,
                logoHeight: rect.height,
                lineHeight: parseFloat(style.lineHeight),
                ringRight:
                    rect.right +
                    parseFloat(style.outlineOffset) +
                    parseFloat(style.outlineWidth),
                scrollWidth: document.documentElement.scrollWidth,
            }
        })
        expect(toggle.x - layout.logoRight).toBeGreaterThanOrEqual(8)
        expect(layout.ringRight).toBeLessThan(toggle.x)
        expect(
            layout.logoHeight,
            `logo wrapped (width ${layout.logoWidth}px, toggle at ${toggle.x}px)`,
        ).toBeLessThanOrEqual(layout.lineHeight)
        expect(layout.scrollWidth).toBeLessThanOrEqual(320)
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
        let reachedHeader = false
        for (let i = 0; i < 200 && !reachedHeader; i++) {
            await page.keyboard.press('Shift+Tab')
            const result = await page.evaluate(() => {
                const el = document.activeElement
                const header = document.getElementById('site-header')
                if (!el || !header || el === document.body) return 'done'
                if (header.contains(el)) return 'done'
                const { bottom } = el.getBoundingClientRect()
                if (bottom > header.getBoundingClientRect().bottom) return null
                return (
                    el.textContent?.trim().slice(0, 40) ||
                    el.getAttribute('aria-label') ||
                    el.tagName
                )
            })
            if (result === 'done') reachedHeader = true
            else if (result !== null) obscured.push(result)
        }
        // Fails loudly if the walk never got back to the top of the page.
        expect(reachedHeader).toBe(true)
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

// Issue #421: without JS the hamburger can't open, so a noscript: fallback
// shows #mobile-nav in flow below md.
test.describe('Navigation without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    for (const width of [320, 393]) {
        for (const path of [
            '/contact/',
            '/privacy/',
            '/this-page-does-not-exist/',
        ]) {
            test(`${path} shows every section link at ${width}px`, async ({
                page,
            }, testInfo) => {
                test.skip(testInfo.project.name !== 'mobile', 'phone widths')
                await page.setViewportSize({ width, height: 800 })
                await page.goto(path)

                await expect(page.locator('#nav-toggle')).toBeHidden()
                await expect(
                    page.getByRole('group', { name: 'Color theme' }),
                ).toBeHidden()
                // The scroll lock and backdrop key off classes only JS removes.
                await expect(page.locator('#mobile-nav-backdrop')).toBeHidden()
                const root = await page.locator('html').evaluate((html) => ({
                    overflow: getComputedStyle(html).overflow,
                    scrollPaddingTop: getComputedStyle(html).scrollPaddingTop,
                    fits: html.scrollWidth <= html.clientWidth,
                }))
                expect(root.overflow).not.toBe('hidden')
                // The header isn't sticky here, so anchors shouldn't stop short of it.
                expect(root.scrollPaddingTop).toBe('0px')
                expect(root.fits).toBe(true)
                // Nor should the header's negative scroll-margin from #453 apply.
                await expect(
                    page.getByRole('link', { name: 'Philipp Storl, home' }),
                ).toHaveCSS('scroll-margin-top', '0px')

                const nav = page.locator('#mobile-nav')
                for (const { href } of navItems) {
                    const link = nav.locator(`a[href="${href}"]`)
                    await expect(link).toBeVisible()
                    await link.click({ trial: true })
                }
                await nav.locator('a[href="/work/"]').click()
                await expect(page).toHaveURL('/work/')
            })
        }
    }

    test('desktop keeps its inline nav and hides the inert theme toggle', async ({
        page,
    }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'desktop width')
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.goto('/contact/')
        await expect(page.locator('#mobile-nav')).toBeHidden()
        await expect(
            page.getByRole('navigation', { name: 'Main navigation' }),
        ).toBeVisible()
        await expect(
            page.getByRole('group', { name: 'Color theme' }),
        ).toBeHidden()
    })
})
