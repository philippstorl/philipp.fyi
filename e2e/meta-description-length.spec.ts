import { test, expect } from '@playwright/test'
import { pages } from '../scripts/contrast-pages.mjs'

// Google truncates meta descriptions around ~155-160 chars; 155 leaves
// margin for the dynamic years-of-experience numbers to grow a digit.
const MAX_META_DESCRIPTION_LENGTH = 155

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
