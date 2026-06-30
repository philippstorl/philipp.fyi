import { test, expect, type Locator, type Page } from '@playwright/test'

// Single source of truth for the gallery size, so a future screenshot
// added/removed from the case study only needs updating here.
const TOTAL_IMAGES = 16
const counterText = (index: number) => `${index} / ${TOTAL_IMAGES}`

async function openLightboxOn(page: Page, locator: Locator) {
    await locator.click()
    await expect(page.locator('#lightbox')).toBeVisible()
}

test.describe('Image lightbox', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/work/voices-conference-website/')
    })

    test('opens an image full-size on click, with caption and counter', async ({
        page,
    }) => {
        await openLightboxOn(page, page.locator('.prose figure img').first())

        await expect(page.locator('#lightbox-caption')).toHaveText(
            'Before — April 2020, plain HTML, agency-maintained',
        )
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(1),
        )
    })

    test('opens directly on the clicked image, not an earlier one', async ({
        page,
    }) => {
        // Regression check: the lightbox used to flash slide 0 before
        // snapping to the slide that was actually clicked. Anchored to a
        // named image (rather than a position index) so it keeps testing
        // the same thing even if images are added earlier in the article.
        const year2025 = page
            .locator('.prose')
            .getByAltText('VOICES website homepage after the 2025 rebrand')
        await openLightboxOn(page, year2025)

        await expect(page.locator('#lightbox-caption')).toHaveText(
            '2025 — second rebrand',
        )
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(7),
        )
    })

    test('the gallery spans the whole case study, not just one section', async ({
        page,
    }) => {
        // The EMEA regional screenshot and the region-picker overview live in
        // different sections of the article; next should still flow between them.
        const emea = page
            .locator('.prose')
            .getByAltText('VOICES London (EMEA) homepage, 2026')
        await openLightboxOn(page, emea)
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(13),
        )

        await page.locator('#lightbox-next').click()
        await expect(page.locator('#lightbox-caption')).toHaveText(
            'The hub page that routes to each regional edition',
        )
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(14),
        )
    })

    test('navigates through the gallery with the next button and arrow keys', async ({
        page,
    }) => {
        // Anchored to a named image rather than .first() so this keeps
        // testing prev/next sync, not the article's current opening image.
        const year2022 = page
            .locator('.prose')
            .getByAltText('VOICES website homepage after the 2022 rebrand')
        await openLightboxOn(page, year2022)

        await page.locator('#lightbox-next').click()
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(5),
        )
        await expect(page.locator('#lightbox-caption')).toHaveText('2023')

        await page.keyboard.press('ArrowRight')
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(6),
        )
        await expect(page.locator('#lightbox-caption')).toHaveText('2024')

        await page.keyboard.press('ArrowLeft')
        await expect(page.locator('#lightbox-counter')).toHaveText(
            counterText(5),
        )
        await expect(page.locator('#lightbox-caption')).toHaveText('2023')
    })

    test('closes on Escape and returns focus to the trigger image', async ({
        page,
    }) => {
        const firstImage = page.locator('.prose figure img').first()
        await openLightboxOn(page, firstImage)

        await page.keyboard.press('Escape')
        await expect(page.locator('#lightbox')).toBeHidden()
        await expect(firstImage).toBeFocused()
    })

    test('closes when tapping the dimmed area around the image', async ({
        page,
    }) => {
        await openLightboxOn(page, page.locator('.prose figure img').first())

        // Top-left corner is outside the image, buttons, and caption.
        await page.locator('#lightbox').click({ position: { x: 5, y: 5 } })
        await expect(page.locator('#lightbox')).toBeHidden()
    })

    test('is keyboard-accessible via Enter on a focused image', async ({
        page,
    }) => {
        const firstImage = page.locator('.prose figure img').first()
        await firstImage.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('#lightbox')).toBeVisible()
    })

    test('stays clickable after navigating away and back via client-side routing', async ({
        page,
    }) => {
        // Regression check: a <script> module's top-level code only runs once
        // per browser session, so re-arriving at this page via Astro's view
        // transitions (not a full reload) used to leave images without
        // click handlers the second time.
        await page.getByText('← All work').first().click()
        await page.waitForURL('**/#work')

        await page
            .locator('a[href="/work/voices-conference-website/"]')
            .first()
            .click()
        await page.waitForURL('**/work/voices-conference-website/')

        await openLightboxOn(page, page.locator('.prose figure img').first())
        await expect(page.locator('#lightbox-caption')).toHaveText(
            'Before — April 2020, plain HTML, agency-maintained',
        )
    })
})

// brand-evolution's figcaptions mix two markup shapes — plain JSX text for
// short captions, and a `{'...'}` JS string expression for any caption long
// enough that Prettier would otherwise break it onto its own line (which
// MDX would then silently wrap in a <p>, see CLAUDE.md). Covering one of
// each here guards against that regression in either direction.
const BRAND_EVOLUTION_TOTAL_IMAGES = 25
const brandEvolutionCounterText = (index: number) =>
    `${index} / ${BRAND_EVOLUTION_TOTAL_IMAGES}`

test.describe('Image lightbox — brand-evolution', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/work/brand-evolution/')
    })

    test('renders a plain-text figcaption', async ({ page }) => {
        await openLightboxOn(page, page.locator('.prose figure img').first())
        await expect(page.locator('#lightbox-caption')).toHaveText('March 2018')
        await expect(page.locator('#lightbox-counter')).toHaveText(
            brandEvolutionCounterText(1),
        )
    })

    test('renders a figcaption written as a JS string expression', async ({
        page,
    }) => {
        const bananatag = page
            .locator('.prose')
            .getByAltText(
                'staffbase.com homepage in March 2021 announcing the Bananatag merger',
            )
        await openLightboxOn(page, bananatag)
        await expect(page.locator('#lightbox-caption')).toHaveText(
            'March 2021 — Bananatag merger announcement',
        )
    })

    test('the gallery covers every image in the article', async ({ page }) => {
        const lastImage = page
            .locator('.prose')
            .getByAltText('staffbase.com homepage on mobile in May 2026')
        await openLightboxOn(page, lastImage)
        await expect(page.locator('#lightbox-counter')).toHaveText(
            brandEvolutionCounterText(BRAND_EVOLUTION_TOTAL_IMAGES),
        )
    })
})
