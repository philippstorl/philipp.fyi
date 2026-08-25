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

test('case study pages set og:type to article with a published time', async ({
    page,
}) => {
    await page.goto('/work/brand-evolution/')
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
        'content',
        'article',
    )
    await expect(
        page.locator('meta[property="article:published_time"]'),
    ).toHaveAttribute('content', '2018')
})

test('work cards link to correct case study URLs', async ({ page }) => {
    await page.goto('/')
    const firstCard = page.locator('#work article').first()
    const link = firstCard.locator('a').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/work\/storyblok-migration\/$/)
})

test('homepage work card covers stay lazy, unlike /work/', async ({ page }) => {
    // Hero's <h1> is the homepage's LCP element, not a work-card image.
    await page.goto('/')
    const coverImages = page.locator('#work article img')
    await expect(coverImages).toHaveCount(4)
    for (const image of await coverImages.all()) {
        await expect(image).toHaveAttribute('loading', 'lazy')
        await expect(image).not.toHaveAttribute('fetchpriority')
    }
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

    test('has no skipped heading levels between the h1 and the card titles', async ({
        page,
    }) => {
        await page.goto('/work/')
        const headings = page.locator('main :is(h1, h2, h3, h4, h5, h6)')
        const tagNames = await headings.evaluateAll((elements) =>
            elements.map((el) => el.tagName),
        )
        expect(tagNames).toEqual(['H1', 'H2', 'H2', 'H2', 'H2'])
    })

    test('eagerly loads the featured and first non-featured cover images, lazily loads the rest', async ({
        page,
    }) => {
        // The true LCP candidate differs by viewport (featured cover on
        // mobile, first non-featured cover on desktop -- featured is CSS-hidden on md:+).
        await page.goto('/work/')
        const coverImages = page.locator('main article img')
        await expect(coverImages).toHaveCount(4)

        await expect(coverImages.nth(0)).toHaveAttribute('loading', 'eager')
        await expect(coverImages.nth(0)).toHaveAttribute(
            'fetchpriority',
            'high',
        )
        await expect(coverImages.nth(1)).toHaveAttribute('loading', 'eager')
        await expect(coverImages.nth(1)).toHaveAttribute(
            'fetchpriority',
            'high',
        )
        await expect(coverImages.nth(2)).toHaveAttribute('loading', 'lazy')
        await expect(coverImages.nth(2)).not.toHaveAttribute('fetchpriority')
        await expect(coverImages.nth(3)).toHaveAttribute('loading', 'lazy')
        await expect(coverImages.nth(3)).not.toHaveAttribute('fetchpriority')
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
