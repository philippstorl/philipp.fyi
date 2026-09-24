import { test, expect } from '@playwright/test'

// X's Twitterbot and LinkedInBot honor robots.txt, so a disallowed share-card
// image never renders in their link previews (issue #330).
test.describe('robots.txt', () => {
    for (const path of ['/', '/work/brand-evolution/']) {
        test(`doesn't disallow the share-card image for ${path}`, async ({
            page,
            request,
        }) => {
            const response = await request.get('/robots.txt')
            expect(response.ok()).toBe(true)
            const disallowed = [
                ...(await response.text()).matchAll(/^Disallow:\s*(\S+)/gim),
            ].map((match) => match[1] ?? '')

            await page.goto(path)
            for (const selector of [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
            ]) {
                const content = await page
                    .locator(selector)
                    .getAttribute('content')
                if (!content) throw new Error(`${path} has no ${selector}`)
                const imagePath = new URL(content).pathname
                expect(imagePath).toMatch(/^\/og\//)
                for (const rule of disallowed) {
                    expect(
                        imagePath.startsWith(rule),
                        `${imagePath} blocked by "Disallow: ${rule}"`,
                    ).toBe(false)
                }
            }
        })
    }
})
