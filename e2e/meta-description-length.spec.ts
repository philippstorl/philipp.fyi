import { test, expect } from '@playwright/test'

// Google truncates meta descriptions around ~155-160 chars; 155 leaves
// margin for the dynamic years-of-experience numbers to grow a digit.
const MAX_META_DESCRIPTION_LENGTH = 155

// Every real page, not just the ones over length when this test was added.
const pages = [
    { reportedPath: '/', gotoPath: '/' },
    { reportedPath: '/about/', gotoPath: '/about/' },
    { reportedPath: '/principles/', gotoPath: '/principles/' },
    { reportedPath: '/recommendations/', gotoPath: '/recommendations/' },
    { reportedPath: '/work/', gotoPath: '/work/' },
    { reportedPath: '/blog/', gotoPath: '/blog/' },
    { reportedPath: '/contact/', gotoPath: '/contact/' },
    {
        reportedPath: '/work/brand-evolution/',
        gotoPath: '/work/brand-evolution/',
    },
    {
        reportedPath: '/work/voices-conference-website/',
        gotoPath: '/work/voices-conference-website/',
    },
    {
        reportedPath: '/work/leadership-operating-model/',
        gotoPath: '/work/leadership-operating-model/',
    },
    {
        reportedPath: '/work/storyblok-migration/',
        gotoPath: '/work/storyblok-migration/',
    },
    // Same nonexistent-route convention as e2e/404.spec.ts.
    { reportedPath: '/404', gotoPath: '/this-page-does-not-exist/' },
]

for (const { reportedPath, gotoPath } of pages) {
    test(`${reportedPath} meta description stays within SEO display length`, async ({
        page,
    }) => {
        await page.goto(gotoPath)
        const content = await page
            .locator('meta[name="description"]')
            .getAttribute('content')
        expect(content).toBeTruthy()
        expect(content!.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
    })
}
