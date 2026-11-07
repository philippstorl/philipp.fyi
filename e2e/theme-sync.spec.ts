import { test, expect, type Page } from '@playwright/test'

const pressedButton = (page: Page) =>
    page.locator('[data-theme-value][aria-pressed="true"]')

test.describe('Theme sync across tabs (issue #503)', () => {
    test('a theme picked in another tab updates this tab and survives navigation', async ({
        context,
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'light' })
        await page.goto('/')
        const other = await context.newPage()
        await other.emulateMedia({ colorScheme: 'light' })
        await other.goto('/')

        await other.getByRole('button', { name: 'Dark mode' }).click()

        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)
        await expect(pressedButton(page)).toHaveAttribute(
            'data-theme-value',
            'dark',
        )

        const mobileToggle = page.locator('#nav-toggle')
        if (await mobileToggle.isVisible()) {
            await mobileToggle.click()
        }
        await page.locator('nav a[href="/principles/"]:visible').click()
        await expect(page).toHaveURL('/principles/')
        await expect(pressedButton(page)).toHaveAttribute(
            'data-theme-value',
            'dark',
        )

        // A stale 'system' selection would follow this OS change.
        await page.emulateMedia({ colorScheme: 'dark' })
        await page.emulateMedia({ colorScheme: 'light' })
        await expect(html).toHaveClass(/dark/)

        // System is stored as a removed key, so the event's newValue is null.
        await other.getByRole('button', { name: 'System preference' }).click()
        await expect(html).not.toHaveClass(/dark/)
        await expect(pressedButton(page)).toHaveAttribute(
            'data-theme-value',
            'system',
        )
    })

    test('clearing storage in another tab switches this tab to System', async ({
        context,
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'light' })
        await page.goto('/')
        await page.getByRole('button', { name: 'Dark mode' }).click()
        const html = page.locator('html')
        await expect(html).toHaveClass(/dark/)

        const other = await context.newPage()
        await other.goto('/')
        await other.evaluate(() => localStorage.clear())

        await expect(html).not.toHaveClass(/dark/)
        await expect(pressedButton(page)).toHaveAttribute(
            'data-theme-value',
            'system',
        )
    })
})
