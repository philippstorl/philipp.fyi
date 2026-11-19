import type { Page } from '@playwright/test'

// Number of rendered lines of the page's <h1>, once the webfont has loaded.
// Throws if the text overflows its box, which one line could also mean.
export async function h1LineCount(page: Page) {
    return page.locator('main h1').evaluate(async (h1) => {
        await document.fonts.ready
        if (h1.scrollWidth > h1.clientWidth) throw new Error('h1 overflows')
        const lineHeight = parseFloat(getComputedStyle(h1).lineHeight)
        return Math.round(h1.getBoundingClientRect().height / lineHeight)
    })
}
