import { test, expect } from '@playwright/test'

const caseStudies = [
    {
        slug: 'storyblok-migration',
        title: 'Migrating staffbase.com to Storyblok & Symfony',
    },
    {
        slug: 'brand-evolution',
        title: '8 years of brand evolution on staffbase.com',
    },
    {
        slug: 'leadership-operating-model',
        title: 'Building a team, a career track, and an operating model',
    },
    {
        slug: 'voices-conference-website',
        title: 'Six years evolving the VOICES conference website',
    },
]

for (const { slug, title } of caseStudies) {
    test(`case study: ${slug} renders correctly`, async ({ page }) => {
        await page.goto(`/work/${slug}/`)
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            title,
        )
        await expect(page.getByText('← All work').first()).toBeVisible()
    })
}

test('work cards link to correct case study URLs', async ({ page }) => {
    await page.goto('/')
    const firstCard = page.locator('#work article').first()
    const link = firstCard.locator('a').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/work\/storyblok-migration\/$/)
})

test.describe('Work page', () => {
    test('shows heading and all 4 case studies', async ({ page }) => {
        await page.goto('/work/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'Work' }),
        ).toBeVisible()
        const cards = page.locator('main article')
        await expect(cards).toHaveCount(4)
    })

    test('links to About, Principles, and Recommendations', async ({
        page,
    }) => {
        await page.goto('/work/')

        const aboutLink = page.locator('main a[href="/about/"]')
        await expect(aboutLink).toBeVisible()
        await aboutLink.click()
        await expect(page).toHaveURL('/about/')

        await page.goto('/work/')
        const principlesLink = page.locator('main a[href="/principles/"]')
        await expect(principlesLink).toBeVisible()
        await principlesLink.click()
        await expect(page).toHaveURL('/principles/')

        await page.goto('/work/')
        const recommendationsLink = page.locator(
            'main a[href="/recommendations/"]',
        )
        await expect(recommendationsLink).toBeVisible()
        await recommendationsLink.click()
        await expect(page).toHaveURL('/recommendations/')
    })
})
