import { test, expect, type Browser } from '@playwright/test'

// Without JS no script adds .dark, so the dark variant and tokens fall back
// to the OS preference (issue #531).
const path = '/work/brand-evolution/'
// The category badge covers plain `dark:` utilities (dark:text-rose-400,
// dark:border-rose-400/30).
const badge = 'main header > div > span:first-child'
const textSelectors = ['h1', 'article p', badge]

type ThemeColors = Awaited<ReturnType<typeof themeColors>>

async function themeColors(
    browser: Browser,
    options: {
        javaScriptEnabled: boolean
        colorScheme: 'light' | 'dark'
        print?: boolean
        storedTheme?: string
    },
) {
    const { print, storedTheme, ...contextOptions } = options
    const context = await browser.newContext(contextOptions)
    if (storedTheme) {
        await context.addInitScript(
            (theme) => window.localStorage.setItem('theme', theme),
            storedTheme,
        )
    }
    const page = await context.newPage()
    await page.goto(path)
    if (print) await page.emulateMedia({ media: 'print' })
    const colors = await page.evaluate(
        ({ textSelectors, badge }) => {
            const style = (selector: string) => {
                const element = document.querySelector(selector)
                if (!element) throw new Error(`No element for ${selector}`)
                return getComputedStyle(element)
            }
            return {
                hasDarkClass:
                    document.documentElement.classList.contains('dark'),
                colorScheme: getComputedStyle(document.documentElement)
                    .colorScheme,
                background: getComputedStyle(document.body).backgroundColor,
                text: textSelectors.map((selector) => style(selector).color),
                badgeBorder: style(badge).borderTopColor,
            }
        },
        { textSelectors, badge },
    )
    await context.close()
    return colors
}

test.describe('Dark mode without JavaScript (issue #531)', () => {
    let light: ThemeColors
    let dark: ThemeColors

    test.beforeAll(async ({ browser }) => {
        light = await themeColors(browser, {
            javaScriptEnabled: true,
            colorScheme: 'light',
        })
        dark = await themeColors(browser, {
            javaScriptEnabled: true,
            colorScheme: 'dark',
        })
        expect(dark.hasDarkClass).toBe(true)
        expect(dark.background).not.toEqual(light.background)
        expect(dark.badgeBorder).not.toEqual(light.badgeBorder)
    })

    test('follows a dark OS preference like the JS-applied dark theme', async ({
        browser,
    }) => {
        const noJs = await themeColors(browser, {
            javaScriptEnabled: false,
            colorScheme: 'dark',
        })
        expect(noJs).toEqual({ ...dark, hasDarkClass: false })
        expect(noJs.colorScheme).toBe('dark')
    })

    test('stays light with a light OS preference', async ({ browser }) => {
        const noJs = await themeColors(browser, {
            javaScriptEnabled: false,
            colorScheme: 'light',
        })
        expect(noJs).toEqual(light)
        expect(noJs.colorScheme).toBe('light')
    })

    test('prints with the light theme on a dark OS', async ({ browser }) => {
        const printed = await themeColors(browser, {
            javaScriptEnabled: false,
            colorScheme: 'dark',
            print: true,
        })
        expect(printed.text).toEqual(light.text)
        expect(printed.badgeBorder).toEqual(light.badgeBorder)
        expect(printed.colorScheme).toBe('light')
    })

    test('with JavaScript, a stored light choice still wins over a dark OS', async ({
        browser,
    }) => {
        const stored = await themeColors(browser, {
            javaScriptEnabled: true,
            colorScheme: 'dark',
            storedTheme: 'light',
        })
        expect(stored).toEqual(light)
    })
})
