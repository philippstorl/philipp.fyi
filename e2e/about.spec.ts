import { test, expect } from '@playwright/test'

test.describe('About page', () => {
    test('shows heading, bio, and facts', async ({ page }) => {
        await page.goto('/about/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'About' }),
        ).toBeVisible()
        await expect(page.getByText('Based').first()).toBeVisible()
        await expect(
            page.getByText('Chemnitz / Leipzig area, Germany', {
                exact: true,
            }),
        ).toBeVisible()
    })

    test('shows the tech stack section', async ({ page }) => {
        await page.goto('/about/')
        await expect(
            page.getByRole('heading', { name: 'How this site is built' }),
        ).toBeVisible()
        await expect(page.getByText('Astro', { exact: true })).toBeVisible()
        await expect(page.getByText('Netlify', { exact: true })).toBeVisible()
    })

    test('"Read more about me" CTA on home links to /about/', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page.locator('#about a[href="/about/"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/about/')
    })

    test('links to Work, Principles, and Recommendations', async ({ page }) => {
        await page.goto('/about/')

        const workLink = page.locator('main a[href="/work/"]')
        await expect(workLink).toBeVisible()
        await workLink.click()
        await expect(page).toHaveURL('/work/')

        await page.goto('/about/')
        const principlesLink = page.locator('main a[href="/principles/"]')
        await expect(principlesLink).toBeVisible()
        await principlesLink.click()
        await expect(page).toHaveURL('/principles/')

        await page.goto('/about/')
        const recommendationsLink = page.locator(
            'main a[href="/recommendations/"]',
        )
        await expect(recommendationsLink).toBeVisible()
        await recommendationsLink.click()
        await expect(page).toHaveURL('/recommendations/')
    })
})
