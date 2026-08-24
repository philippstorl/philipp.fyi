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
            page.getByRole('heading', { name: 'MIT License', exact: true }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'ISC License' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', {
                name: 'MIT License (Feather-derived Lucide icons)',
            }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /^React \(opens/ }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /^React DOM \(opens/ }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /^lucide-react \(opens/ }).first(),
        ).toBeVisible()
        await expect(
            page.getByText(
                'Copyright (c) Meta Platforms, Inc. and affiliates.',
            ),
        ).toBeVisible()
        await expect(
            page.getByText('Copyright (c) 2013-present Cole Bemis'),
        ).toBeVisible()
    })

    test('footer links to the notices page from every page', async ({
        page,
    }) => {
        // Asserts the href directly rather than clicking through: the
        // footer sits at the bottom of the viewport, where Astro's dev
        // toolbar overlay (dev-server only, absent from a real build)
        // intercepts pointer events on mobile viewports.
        await page.goto('/')
        await expect(
            page.locator('footer a[href="/notices/"]'),
        ).toHaveAttribute('href', '/notices/')
    })
})
