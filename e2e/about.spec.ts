import { test, expect } from '@playwright/test'

test.describe('About page', () => {
    test('shows heading, bio, and facts', async ({ page }) => {
        await page.goto('/about/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'About' }),
        ).toBeVisible()
        await expect(page.getByText('Based').first()).toBeVisible()
        await expect(
            page.getByText('Chemnitz / Leipzig area, Germany', {
                exact: true,
            }),
        ).toBeVisible()
    })

    test('shows the tech stack section', async ({ page }) => {
        await page.goto('/about/')
        await expect(
            page.getByRole('heading', { name: 'How this site is built' }),
        ).toBeVisible()
        await expect(page.getByText('Astro', { exact: true })).toBeVisible()
        await expect(page.getByText('Netlify', { exact: true })).toBeVisible()
    })

    test('"Read more about me" CTA on home links to /about/', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page.locator('#about a[href="/about/"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/about/')
    })

    test('links to Work, Principles, and Recommendations', async ({ page }) => {
        await page.goto('/about/')

        const workLink = page.locator('main a[href="/work/"]')
        await expect(workLink).toBeVisible()
        await workLink.click()
        await expect(page).toHaveURL('/work/')

        await page.goto('/about/')
        const principlesLink = page.locator('main a[href="/principles/"]')
        await expect(principlesLink).toBeVisible()
        await principlesLink.click()
        await expect(page).toHaveURL('/principles/')

        await page.goto('/about/')
        const recommendationsLink = page.locator(
            'main a[href="/recommendations/"]',
        )
        await expect(recommendationsLink).toBeVisible()
        await recommendationsLink.click()
        await expect(page).toHaveURL('/recommendations/')
    })

    test('interlink card labels keep their arrow and stay inside the card', async ({
        page,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'chromium',
            'sets its own viewport sizes, so one project covers it',
        )
        // Guards issue #529: "Recommendations" overflowed and its arrow collapsed at 640-767px.
        // Under WCAG 1.4.12 text spacing the unbreakable word may use the padding, not leave the card.
        const textSpacing =
            '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }'
        for (const path of [
            '/about/',
            '/principles/',
            '/recommendations/',
            '/work/',
        ]) {
            await page.goto(path)
            await page.evaluate(() => document.fonts.ready)
            for (const spaced of [false, true]) {
                if (spaced) await page.addStyleTag({ content: textSpacing })
                for (const width of [640, 767, 768]) {
                    await page.setViewportSize({ width, height: 900 })
                    const cards = await page
                        .locator('main a.group.rounded-xl')
                        .evaluateAll((els) =>
                            els.map((card) => {
                                const label =
                                    card.querySelector('p:last-of-type')
                                const text = label
                                    ? [...label.childNodes].find(
                                          (node) =>
                                              node.nodeType ===
                                                  Node.TEXT_NODE &&
                                              node.textContent?.trim(),
                                      )
                                    : undefined
                                const range = document.createRange()
                                if (text) range.selectNodeContents(text)
                                const arrow = label
                                    ?.querySelector('svg')
                                    ?.getBoundingClientRect()
                                const rect = card.getBoundingClientRect()
                                const style = getComputedStyle(card)
                                const row = card.closest('ul')
                                return {
                                    label: text?.textContent?.trim(),
                                    arrowWidth: arrow?.width,
                                    arrowRight: arrow?.right ?? Infinity,
                                    arrowBottom: arrow?.bottom ?? Infinity,
                                    textRight:
                                        range.getBoundingClientRect().right,
                                    contentRight:
                                        rect.right -
                                        parseFloat(style.paddingRight),
                                    contentBottom:
                                        rect.bottom -
                                        parseFloat(style.paddingBottom),
                                    borderRight: rect.right,
                                    rowOverflows: row
                                        ? row.scrollWidth > row.clientWidth
                                        : true,
                                }
                            }),
                        )
                    expect(cards).toHaveLength(3)
                    for (const card of cards) {
                        const where = `${path} at ${width}px${spaced ? ' with text spacing' : ''}: ${card.label}`
                        expect(card.label, where).toBeTruthy()
                        expect(card.arrowWidth, where).toBe(16)
                        expect(card.arrowRight, where).toBeLessThanOrEqual(
                            card.contentRight + 0.5,
                        )
                        expect(card.arrowBottom, where).toBeLessThanOrEqual(
                            card.contentBottom + 0.5,
                        )
                        expect(card.textRight, where).toBeLessThanOrEqual(
                            (spaced ? card.borderRight : card.contentRight) +
                                0.5,
                        )
                        expect(card.rowOverflows, where).toBe(false)
                    }
                }
            }
        }
    })
})
