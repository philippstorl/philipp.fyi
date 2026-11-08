import { expect, type Page } from '@playwright/test'

// The theme-color contents whose media currently matches, plus the content of
// the `scheme` meta (by its static data-scheme), so no hex copy lives here.
function readThemeColors(page: Page, scheme: 'light' | 'dark') {
    return page.evaluate((scheme) => {
        const metas = [
            ...document.querySelectorAll<HTMLMetaElement>(
                'meta[name="theme-color"]',
            ),
        ]
        const original = metas.find((meta) => meta.dataset.scheme === scheme)
        return {
            active: metas
                .filter(
                    (meta) =>
                        !meta.media || window.matchMedia(meta.media).matches,
                )
                .map((meta) => meta.content),
            expected: original ? [original.content] : [],
        }
    }, scheme)
}

// Asserts exactly the `scheme` theme-color meta applies, which is what
// Chrome for Android tints its toolbar from (issue #507).
export async function expectThemeColor(page: Page, scheme: 'light' | 'dark') {
    await expect
        .poll(async () => {
            const { active, expected } = await readThemeColors(page, scheme)
            return expected.length === 1 && active.join() === expected.join()
        })
        .toBe(true)
}
