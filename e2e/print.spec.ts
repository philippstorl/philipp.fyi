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
