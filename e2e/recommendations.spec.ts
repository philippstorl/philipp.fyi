import { test, expect } from '@playwright/test'

test.describe('Recommendations page', () => {
    test('shows all recommendations', async ({ page }) => {
        await page.goto('/recommendations/')
        const items = page.locator('ol[role="list"] > li')
        await expect(items).toHaveCount(14)
    })

    test('intro paragraph has correct spacing around the LinkedIn link', async ({
        page,
    }) => {
        // Guards the whitespace-collapse spot regressed by issue #297.
        await page.goto('/recommendations/')
        const intro = page.locator('p', { hasText: 'collected from' })
        await expect(intro).toHaveText(
            "Recommendations from colleagues, managers, direct reports, and external partners I've worked with over the years, collected from LinkedIn (opens in a new tab), unedited except for formatting.",
        )
        // toHaveText normalizes whitespace, so a space before the out-of-flow
        // sr-only suffix ("LinkedIn , unedited") only shows up on screen.
        const gap = await intro.locator('a').evaluate((link) => {
            const label = link.firstChild
            const after = link.nextSibling
            const start = label?.textContent?.indexOf('LinkedIn') ?? -1
            if (!label || !after || start < 0) {
                throw new Error('missing text nodes')
            }
            const range = document.createRange()
            range.setStart(label, start)
            range.setEnd(label, start + 'LinkedIn'.length)
            const labelRight = range.getBoundingClientRect().right
            range.setStart(after, 0)
            range.setEnd(after, 1)
            if (range.toString() !== ',') throw new Error('expected a comma')
            return range.getBoundingClientRect().left - labelRight
        })
        expect(Math.abs(gap)).toBeLessThan(1)
    })

    test('"What people I\'ve worked with say" section CTA on home links to /recommendations/', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page.locator(
            '#recommendations a[href="/recommendations/"]',
        )
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/recommendations/')
    })

    test('links to About, Principles, and Work', async ({ page }) => {
        await page.goto('/recommendations/')

        const aboutLink = page.locator('main a[href="/about/"]')
        await expect(aboutLink).toBeVisible()
        await aboutLink.click()
        await expect(page).toHaveURL('/about/')

        await page.goto('/recommendations/')
        const principlesLink = page.locator('main a[href="/principles/"]')
        await expect(principlesLink).toBeVisible()
        await principlesLink.click()
        await expect(page).toHaveURL('/principles/')

        await page.goto('/recommendations/')
        const workLink = page.locator('main a[href="/work/"]')
        await expect(workLink).toBeVisible()
        await workLink.click()
        await expect(page).toHaveURL('/work/')
    })

    test('interlink cards have a separated accessible name, not a run-on', async ({
        page,
    }) => {
        // Guards issue #301: eyebrow and label used to concatenate with no separator.
        await page.goto('/recommendations/')
        for (const name of [
            'Meet the person they describe: About',
            'The principles behind the work: Principles',
            'The projects these people are describing: Work',
        ]) {
            await expect(
                page.getByRole('link', { name, exact: true }),
            ).toBeVisible()
        }

        // Same component on the other three pages of the interlink square.
        for (const path of ['/about/', '/principles/', '/work/']) {
            await page.goto(path)
            const cards = page.locator('main a.group.rounded-xl')
            await expect(cards).toHaveCount(3)
            for (const card of await cards.all()) {
                const [eyebrow, label] = await card.locator('p').allInnerTexts()
                await expect(card).toHaveAccessibleName(
                    `${eyebrow?.trim()}: ${label?.trim()}`,
                )
            }
        }
    })
})
