import { test, expect } from '@playwright/test'

const caseStudies = [
    {
        slug: 'storyblok-migration',
        title: 'Migrating staffbase.com to Storyblok & Symfony',
    },
    {
        slug: 'brand-evolution',
        title: 'Eight years of brand evolution on staffbase.com',
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
        await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
        // Back to work link should be present
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
