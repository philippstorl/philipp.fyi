import { test, expect, type Page } from '@playwright/test'

// Paper is white and Chrome drops page backgrounds by default, so the dark
// theme's light text would print near-invisible (issue #528).
const pages = [
    {
        path: '/work/brand-evolution/',
        // The category badge covers plain `dark:` utilities (dark:text-rose-400).
        selectors: [
            'h1',
            'article h2',
            'article p',
            'figcaption',
            'main header > div > span:first-child',
        ],
    },
    { path: '/privacy/', selectors: ['h1', 'main h2', 'main p'] },
]

async function textColors(page: Page, selectors: string[]) {
    return page.evaluate(
        (list) =>
            list.map((selector) => {
                const element = document.querySelector(selector)
                if (!element) throw new Error(`No element for ${selector}`)
                return getComputedStyle(element).color
            }),
        selectors,
    )
}

test.describe('Printing in dark mode (issue #528)', () => {
    for (const { path, selectors } of pages) {
        test(`${path} prints with the light theme's colors`, async ({
            page,
        }) => {
            await page.emulateMedia({ colorScheme: 'light', media: 'print' })
            await page.goto(path)
            await expect(page.locator('html')).not.toHaveClass(/dark/)
            const light = await textColors(page, selectors)

            await page.emulateMedia({ colorScheme: 'dark', media: 'screen' })
            await expect(page.locator('html')).toHaveClass(/dark/)
            const darkScreen = await textColors(page, selectors)
            expect(darkScreen).not.toEqual(light)

            await page.emulateMedia({ media: 'print' })
            // CSS alone does it: the class stays on while printing.
            await expect(page.locator('html')).toHaveClass(/dark/)
            expect(await textColors(page, selectors)).toEqual(light)
            const colorScheme = await page.evaluate(
                () => getComputedStyle(document.documentElement).colorScheme,
            )
            expect(colorScheme).toBe('light')

            // Back on screen, the dark theme is untouched.
            await page.emulateMedia({ media: 'screen' })
            expect(await textColors(page, selectors)).toEqual(darkScreen)
        })
    }
})

test.describe('Print layout (issue #533)', () => {
    // Print lays out at paper width: A4 portrait at default margins is ~718px
    // (below md, so the mobile header), wide paper or no margins reach md.
    // CSS locators, not getByRole: role queries skip hidden elements.
    const desktopNav = 'nav[aria-label="Main navigation"]'
    const themeToggle = '[role="group"][aria-label="Color theme"]'
    const headerControls = [
        desktopNav,
        '#nav-toggle',
        themeToggle,
        '#mobile-nav',
        '#mobile-nav-backdrop',
    ]
    const paperWidths = [
        { width: 718, onScreen: ['#nav-toggle', themeToggle] },
        { width: 1100, onScreen: [desktopNav, themeToggle] },
    ]

    async function expectHeaderPrintsLogoOnly(page: Page) {
        await page.emulateMedia({ media: 'print' })
        for (const selector of headerControls) {
            await expect(page.locator(selector)).toBeHidden()
        }
        await expect(
            page.getByRole('link', { name: 'Philipp Storl, home' }),
        ).toBeVisible()
    }

    for (const { width, onScreen } of paperWidths) {
        test(`only the logo prints from the header at ${width}px`, async ({
            page,
        }) => {
            await page.setViewportSize({ width, height: 1000 })
            await page.goto('/')
            for (const selector of onScreen) {
                await expect(page.locator(selector)).toBeVisible()
            }
            await expectHeaderPrintsLogoOnly(page)
        })
    }

    test('an open mobile menu does not print', async ({ page }) => {
        await page.setViewportSize({ width: 718, height: 1000 })
        await page.goto('/')
        await page.locator('#nav-toggle').click()
        await expect(page.locator('#mobile-nav')).toBeVisible()
        await expect(page.locator('#mobile-nav-backdrop')).toBeVisible()
        await expectHeaderPrintsLogoOnly(page)
    })

    test('without JavaScript the always-open mobile nav does not print', async ({
        browser,
    }) => {
        const context = await browser.newContext({
            javaScriptEnabled: false,
            viewport: { width: 718, height: 1000 },
        })
        const page = await context.newPage()
        await page.goto('/')
        await expect(page.locator('#mobile-nav')).toBeVisible()
        await expectHeaderPrintsLogoOnly(page)
        await context.close()
    })

    test('prose external links print their URL, internal ones do not', async ({
        page,
    }) => {
        await page.goto('/privacy/')
        const afterContent = (selector: string) =>
            page
                .locator(selector)
                .first()
                .evaluate((link) => getComputedStyle(link, '::after').content)
        const external = 'article a[href="https://automattic.com/privacy/"]'
        const internal = 'article a[href="/contact/"]'

        expect(await afterContent(external)).toBe('none')

        await page.emulateMedia({ media: 'print' })
        expect(await afterContent(external)).toContain(
            'https://automattic.com/privacy/',
        )
        expect(await afterContent(internal)).toBe('none')
    })

    test('prose h3 headings stay with their content', async ({ page }) => {
        await page.goto('/privacy/')
        const breakAfter = () =>
            page
                .locator('article h3')
                .first()
                .evaluate((heading) => getComputedStyle(heading).breakAfter)
        expect(await breakAfter()).toBe('auto')
        await page.emulateMedia({ media: 'print' })
        expect(await breakAfter()).toBe('avoid')
    })

    test('case-study headings stay with their content and figures stay whole', async ({
        page,
    }) => {
        await page.goto('/work/brand-evolution/')
        const breaks = () =>
            page.evaluate(() => {
                const heading = document.querySelector('article h2')
                const figure = document.querySelector('article figure')
                if (!heading || !figure) throw new Error('Missing h2/figure')
                return {
                    breakAfter: getComputedStyle(heading).breakAfter,
                    breakInside: getComputedStyle(figure).breakInside,
                }
            })

        expect(await breaks()).toEqual({
            breakAfter: 'auto',
            breakInside: 'auto',
        })
        await page.emulateMedia({ media: 'print' })
        expect(await breaks()).toEqual({
            breakAfter: 'avoid',
            breakInside: 'avoid',
        })
    })
})
