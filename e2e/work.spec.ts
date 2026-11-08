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
        // Exact names keep the decorative "←" out of them; NVDA reads it as
        // "left arrow" (issue #500).
        const main = page.locator('#main-content')
        for (const name of ['All work', 'Back to all work']) {
            const link = main.getByRole('link', { name, exact: true })
            await expect(link).toHaveAttribute('href', '/work/')
            await expect(link).toContainText('←')
        }
        await expect(
            main.getByRole('link', { name: 'All work', exact: true }),
        ).toBeVisible()
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

test('case study share image alt text is the case study title', async ({
    page,
}) => {
    const { slug, title } = caseStudies.find(
        (c) => c.slug === 'brand-evolution',
    )!
    await page.goto(`/work/${slug}/`)
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
        'content',
        title,
    )
    await expect(
        page.locator('meta[name="twitter:image:alt"]'),
    ).toHaveAttribute('content', title)
})

test('case study pages preload JetBrains Mono, the homepage does not', async ({
    page,
}) => {
    const monoPreload = page.locator(
        'link[rel="preload"][as="font"][href*="jetbrains-mono-latin-400-normal"]',
    )
    await page.goto('/work/brand-evolution/')
    await expect(monoPreload).toHaveCount(1)
    await page.goto('/')
    await expect(monoPreload).toHaveCount(0)
})

test('a screenshot reused across grids gets one srcset, so phones fetch it once', async ({
    page,
}) => {
    // Regression (#345): voices-2020/voices-2026 each sit in two differently-tiered grids.
    let reusedCount = 0
    for (const { slug } of caseStudies) {
        await page.goto(`/work/${slug}/`)
        const figures = await page
            .locator('.prose figure img')
            .evaluateAll((images) =>
                images.map((img) => ({
                    source: img.getAttribute('data-lightbox-src'),
                    srcset: img.getAttribute('srcset'),
                })),
            )
        const srcsetsBySource = new Map<string | null, (string | null)[]>()
        for (const { source, srcset } of figures) {
            srcsetsBySource.set(source, [
                ...(srcsetsBySource.get(source) ?? []),
                srcset,
            ])
        }
        for (const srcsets of srcsetsBySource.values()) {
            if (srcsets.length < 2) continue
            reusedCount++
            expect(new Set(srcsets).size, slug).toBe(1)
        }
    }
    expect(reusedCount).toBeGreaterThan(0)
})

test('full-width figures offer a 1080w candidate between 720w and 1440w', async ({
    page,
}) => {
    // Regression (#396): with only 720/1440w, a ~950px phone need jumped to 1440w.
    let fullWidthCount = 0
    for (const { slug } of caseStudies) {
        await page.goto(`/work/${slug}/`)
        const srcsets = await page
            .locator(
                '.prose figure img[data-astro-image="full-width"][sizes="(min-width: 48em) 45em, calc(100vw - 3em)"]',
            )
            .evaluateAll((images) =>
                images.map((img) => img.getAttribute('srcset') ?? ''),
            )
        for (const srcset of srcsets) {
            const widths = [...srcset.matchAll(/ (\d+)w/g)].map((m) =>
                Number(m[1]),
            )
            // Astro drops candidates wider than the source, so a narrow source can't have one.
            if (Math.max(...widths) <= 1080) continue
            fullWidthCount++
            expect(widths, slug).toContain(1080)
        }
    }
    expect(fullWidthCount).toBeGreaterThan(0)
})

test('image sizes are in em, so they scale with the browser font size', async ({
    page,
}) => {
    // Regression (#550): px sizes understate the rem layout at a larger default font size.
    let checked = 0
    for (const path of [
        '/',
        '/work/',
        ...caseStudies.map(({ slug }) => `/work/${slug}/`),
    ]) {
        await page.goto(path)
        const images = await page.locator('img[sizes]').evaluateAll((imgs) =>
            imgs.map((img) => ({
                sizes: img.getAttribute('sizes') ?? '',
                width: img.getAttribute('width'),
                proseConstrained:
                    img.closest('.prose') !== null &&
                    img.getAttribute('data-astro-image') === 'constrained',
            })),
        )
        for (const { sizes, width, proseConstrained } of images) {
            checked++
            // fixedWidthFigureSizing's slot really is `width` CSS px, and so is its breakpoint.
            const rest = proseConstrained
                ? sizes.replace(
                      new RegExp(`^\\(min-width: \\d+px\\) ${width}px, `),
                      '',
                  )
                : sizes
            expect(rest, `${path}: ${sizes}`).not.toContain('px')
        }
    }
    expect(checked).toBeGreaterThan(0)
})

test('screenshots are not upscaled at a larger browser font size', async ({
    page,
}) => {
    // Regression (#550). Sets the default font size like a user setting; the
    // CDP session stays attached, since detaching it drops the override.
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20 } })
    for (const path of ['/work/', '/work/brand-evolution/']) {
        await page.goto(path)
        const picks = await page
            .locator('img[sizes]')
            .evaluateAll(async (imgs: HTMLImageElement[]) => {
                for (const img of imgs) img.loading = 'eager'
                await Promise.all(imgs.map((img) => img.decode()))
                return imgs.map((img) => {
                    const candidates = img.srcset.split(', ').map((entry) => {
                        const [url = '', descriptor = ''] = entry.split(' ')
                        return {
                            url: new URL(url, location.href).href,
                            width: parseInt(descriptor),
                        }
                    })
                    const chosen = candidates.find(
                        ({ url }) => url === img.currentSrc,
                    )
                    return {
                        src: img.currentSrc,
                        chosen: chosen?.width ?? 0,
                        widest: Math.max(...candidates.map((c) => c.width)),
                        needed:
                            img.getBoundingClientRect().width *
                            devicePixelRatio,
                    }
                })
            })
        for (const { src, chosen, widest, needed } of picks) {
            // A hidden cover needs nothing; the widest candidate is the source's limit.
            if (needed === 0 || chosen === widest) continue
            expect(chosen, src).toBeGreaterThanOrEqual(Math.floor(needed))
        }
    }
})

test('VOICES regional-grid lead-in renders as one muted 14px paragraph', async ({
    page,
}) => {
    // Regression (#506): MDX wrapped the line-broken text in a nested <p>.
    await page.goto('/work/voices-conference-website/')
    const leadIn = page.getByText(
        'Same component library, three regional configurations, captured side by side in 2026:',
        { exact: true },
    )
    await expect(leadIn).toHaveClass('mb-2 text-sm text-muted')
    await expect(leadIn).toHaveCSS('font-size', '14px')
    const { color, mutedColor, nextIsGrid } = await leadIn.evaluate((el) => {
        const probe = document.createElement('span')
        probe.className = 'text-muted'
        el.parentElement?.append(probe)
        const mutedColor = getComputedStyle(probe).color
        probe.remove()
        return {
            color: getComputedStyle(el).color,
            mutedColor,
            nextIsGrid: el.nextElementSibling?.classList.contains('grid'),
        }
    })
    expect(color).toBe(mutedColor)
    expect(nextIsGrid).toBe(true)
})

test('work cards link to correct case study URLs', async ({ page }) => {
    await page.goto('/')
    const firstCard = page.locator('#work article').first()
    const link = firstCard.locator('a').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/work\/storyblok-migration\/$/)
})

test('lowest-order case study gets the full-row card on desktop', async ({
    page,
}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Every card is full-width')
    await page.goto('/work/')
    const cards = page.locator('main article')
    const featuredBox = await cards.first().boundingBox()
    const regularBox = await cards.nth(1).boundingBox()
    expect(featuredBox!.width).toBeGreaterThan(regularBox!.width * 2)
    await expect(cards.first().locator('a').first()).toHaveAttribute(
        'href',
        '/work/storyblok-migration/',
    )
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

    test('case study cards and interlinks are exposed as lists', async ({
        page,
    }) => {
        await page.goto('/work/')
        await expect(
            page.locator('main ol[role="list"] > li > article'),
        ).toHaveCount(4)
        await expect(
            page.locator('main ul[role="list"] > li > a[href="/about/"]'),
        ).toHaveCount(1)
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
