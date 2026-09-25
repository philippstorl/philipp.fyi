import { test, expect } from '@playwright/test'
import { isNoindexHtml } from '../src/utils/sitemap'

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

    // Hidden until the first post publishes (issue #392); these flip with the empty state above.
    test('is noindexed while empty but keeps its canonical link', async ({
        page,
    }) => {
        await page.goto('/blog/')
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
            'content',
            'noindex',
        )
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
            'href',
            'https://philipp.fyi/blog/',
        )
    })

    test('no page advertises the empty RSS feed', async ({ page }) => {
        for (const path of ['/', '/blog/']) {
            await page.goto(path)
            await expect(
                page.locator(
                    'link[rel="alternate"][type="application/rss+xml"]',
                ),
            ).toHaveCount(0)
        }
    })

    test('is excluded from the sitemap while empty', async ({ request }) => {
        // The sitemap only exists in build output; its filter drops pages this predicate matches.
        const html = async (path: string) => (await request.get(path)).text()
        expect(isNoindexHtml(await html('/blog/'))).toBe(true)
        expect(isNoindexHtml(await html('/about/'))).toBe(false)
    })

    test("RSS feed's channel link points at /blog/", async ({ request }) => {
        const response = await request.get('/rss.xml')
        expect(response.ok()).toBe(true)
        const channelHead = (await response.text()).split('<item>')[0]
        expect(channelHead).toContain('<link>https://philipp.fyi/blog/</link>')
    })

    test('renders header and footer chrome', async ({ page }) => {
        await page.goto('/blog/')
        await expect(page.locator('#site-header')).toBeVisible()
        await expect(page.locator('footer')).toBeVisible()
        await expect(page.getByText('philipp.fyi')).toBeVisible()
    })
})
