import { test, expect } from '@playwright/test'

test.describe('Third-party notices page', () => {
    test('shows heading and license notices for React, React DOM, and lucide-react', async ({
        page,
    }) => {
        await page.goto('/notices/')
        await expect(
            page.getByRole('heading', {
                level: 1,
                name: 'Third-party notices',
            }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'MIT License' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'ISC License' }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /^React \(opens/ }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /^React DOM \(opens/ }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /^lucide-react \(opens/ }),
        ).toBeVisible()
        await expect(
            page.getByText(
                'Copyright (c) Meta Platforms, Inc. and affiliates.',
            ),
        ).toBeVisible()
    })

    test('footer links to the notices page from every page', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page.locator('footer a[href="/notices/"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/notices/')
    })
})
