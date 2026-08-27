import { test, expect } from '@playwright/test'

test.describe('Blog page', () => {
    test('loads with correct title and meta description', async ({ page }) => {
        await page.goto('/blog/')
        await expect(page).toHaveTitle('Blog | Philipp Storl')
        await expect(page.locator('meta[name="description"]')).toHaveAttribute(
            'content',
            'Writing on web development, tooling, and building things that last.',
        )
    })

    test('shows heading and the "coming soon" empty state', async ({
        page,
    }) => {
        // All posts are draft: true (CLAUDE.md) -- fails once one publishes,
        // the signal to add slug-page coverage.
        await page.goto('/blog/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'Blog' }),
        ).toBeVisible()
        await expect(page.getByText('Writing coming soon.')).toBeVisible()
        await expect(page.locator('main ol')).toHaveCount(0)
    })

    test('renders header and footer chrome', async ({ page }) => {
        await page.goto('/blog/')
        await expect(page.locator('#site-header')).toBeVisible()
        await expect(page.locator('footer')).toBeVisible()
        await expect(page.getByText('philipp.fyi')).toBeVisible()
    })
})
