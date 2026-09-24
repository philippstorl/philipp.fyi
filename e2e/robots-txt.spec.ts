import { test, expect } from '@playwright/test'
import robotsParser from 'robots-parser'

const PAGES = [
    '/',
    '/about/',
    '/work/',
    '/work/brand-evolution/',
    '/principles/',
    '/recommendations/',
    '/contact/',
    '/blog/',
]

// X and LinkedIn skip link-preview images that robots.txt disallows (issue #330).
const SOCIAL_CRAWLERS = ['Twitterbot', 'LinkedInBot']

test("robots.txt doesn't block social crawlers from share-card images", async ({
    page,
    request,
}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Not viewport-dependent')

    const response = await request.get('/robots.txt')
    expect(response.ok()).toBe(true)
    const robotsTxt = await response.text()

    for (const path of PAGES) {
        await page.goto(path)
        for (const selector of [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
        ]) {
            const imageUrl = await page
                .locator(selector)
                .getAttribute('content')
            if (!imageUrl) throw new Error(`${path} has no ${selector}`)
            // Parsed against the image's own origin: isAllowed() returns
            // undefined for a cross-origin URL.
            const robots = robotsParser(
                new URL('/robots.txt', imageUrl).href,
                robotsTxt,
            )
            for (const crawler of SOCIAL_CRAWLERS) {
                expect(
                    robots.isAllowed(imageUrl, crawler),
                    `${crawler} blocked from ${imageUrl} (${path})`,
                ).toBe(true)
            }
        }
    }
})
