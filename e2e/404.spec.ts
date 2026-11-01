import { test, expect } from '@playwright/test'
import { navItems } from '../src/data/navigation'
import {
    NAV_LINK_ACTIVE_CLASS,
    NAV_LINK_UNDERLINE_ACTIVE_CLASS,
} from '../src/utils/nav-active'

const activeClasses = [NAV_LINK_ACTIVE_CLASS, NAV_LINK_UNDERLINE_ACTIVE_CLASS]

test.describe('404 page', () => {
    test('unknown route serves the 404 page', async ({ page }) => {
        const response = await page.goto('/this-page-does-not-exist/')
        expect(response?.status()).toBe(404)
    })

    test('404 page has the expected headline', async ({ page }) => {
        await page.goto('/this-page-does-not-exist/', {
            waitUntil: 'domcontentloaded',
        })
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'This page took the wave.',
        )
    })

    test('back home link on 404 works', async ({ page }) => {
        await page.goto('/this-page-does-not-exist/', {
            waitUntil: 'domcontentloaded',
        })
        await page.click('text=← Back home')
        await expect(page).toHaveURL('/')
    })

    test('is noindexed and has no canonical link (issue #257)', async ({
        page,
    }) => {
        await page.goto('/this-page-does-not-exist/', {
            waitUntil: 'domcontentloaded',
        })
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
            'content',
            'noindex',
        )
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
        await expect(page.locator('meta[property="og:url"]')).toHaveCount(0)
    })
})

test.describe('404 page under a section URL (issue #548)', () => {
    const navLinks = '#site-header a[data-nav-link]'

    for (const path of ['/work/nope/', '/about/nope/']) {
        test(`${path} marks no nav link current`, async ({ page }) => {
            // Raw HTML, since updateActiveNav() rewrites the state on load.
            const response = await page.request.get(path)
            expect(response.status()).toBe(404)
            const serverLinks =
                (await response.text()).match(/<a [^>]*data-nav-link[^>]*>/g) ??
                []
            // Desktop and mobile nav.
            expect(serverLinks).toHaveLength(navItems.length * 2)
            for (const tag of serverLinks) {
                expect(tag).not.toContain('aria-current')
                const classes = tag.match(/class="([^"]*)"/)?.[1]?.split(/\s+/)
                expect(classes).toBeDefined()
                for (const cls of activeClasses) {
                    expect(classes).not.toContain(cls)
                }
            }

            const pageResponse = await page.goto(path)
            expect(pageResponse?.status()).toBe(404)
            await expect(page.locator(`${navLinks}[aria-current]`)).toHaveCount(
                0,
            )
            for (const link of await page.locator(navLinks).all()) {
                for (const cls of activeClasses) {
                    await expect(link).not.toContainClass(cls)
                }
            }
        })
    }

    test('a client-side navigation into a 404 clears the current link', async ({
        page,
    }) => {
        await page.goto('/about/')
        await expect(page.locator(`${navLinks}[aria-current]`)).toHaveCount(2)

        // No page links to a 404, so add one for the router to intercept.
        await page.evaluate(() => {
            const link = document.createElement('a')
            link.id = 'stale-link'
            link.href = '/work/nope/'
            link.textContent = 'Stale link'
            document.getElementById('main-content')?.prepend(link)
            Object.assign(window, { beforeSoftNav: true })
        })
        await page.locator('#stale-link').click()
        await expect(page).toHaveURL('/work/nope/')
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'This page took the wave.',
        )
        // Persists only if the router swapped the page instead of reloading it.
        expect(await page.evaluate(() => 'beforeSoftNav' in window)).toBe(true)
        await expect(page.locator(`${navLinks}[aria-current]`)).toHaveCount(0)
    })

    test('a nav link from the 404 page marks its own link current', async ({
        page,
    }) => {
        await page.goto('/work/nope/')
        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/about/"]:visible').click()
        await expect(page).toHaveURL('/about/')

        for (const nav of [
            'nav[aria-label="Main navigation"]',
            '#mobile-nav',
        ]) {
            await expect(
                page.locator(`${nav} a[href="/about/"]`),
            ).toHaveAttribute('aria-current', 'page')
            await expect(page.locator(`${nav} a[aria-current]`)).toHaveCount(1)
        }
    })
})
