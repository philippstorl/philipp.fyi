import { test, expect, type Locator } from '@playwright/test'
import { CURRENT_EMPLOYER } from '../src/data/employer'
import { NEW_TAB_SUFFIX } from '../src/utils/a11y'
import { hero } from '../src/data/hero'
import { SITE_NAME } from '../src/data/site'
import { GITHUB_URL, LINKEDIN_URL } from '../src/data/social'

test.describe('Home page', () => {
    test('has correct title and headline', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveTitle('Philipp Storl | Principal Web Engineer')
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'I build things that last.',
        )
    })

    test('share title names the role, not just the name', async ({ page }) => {
        await page.goto('/')
        const title = 'Philipp Storl | Principal Web Engineer'
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
            'content',
            title,
        )
        await expect(
            page.locator('meta[name="twitter:title"]'),
        ).toHaveAttribute('content', title)
    })

    test('availability badge follows hero.available', async ({ page }) => {
        await page.goto('/')
        const badge = page.getByText(hero.availabilityText)
        if (hero.available) {
            await expect(badge).toBeVisible()
        } else {
            await expect(badge).toHaveCount(0)
        }
    })

    test('hero links to the current employer in a new tab', async ({
        page,
    }) => {
        await page.goto('/')
        const link = page
            .getByRole('region', { name: 'Introduction' })
            .getByRole('link', { name: CURRENT_EMPLOYER.name, exact: false })
        await expect(link).toHaveAttribute('href', CURRENT_EMPLOYER.url)
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(
            page
                .getByRole('region', { name: 'Introduction' })
                .locator('p')
                .first(),
        ).toContainText(
            `Now at ${CURRENT_EMPLOYER.name}${NEW_TAB_SUFFIX}, after years`,
        )
    })

    test('og:type is website, not article', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
            'content',
            'website',
        )
    })

    test('share image alt text describes the homepage card', async ({
        page,
    }) => {
        await page.goto('/')
        const alt = 'Philipp Storl: I build things that last.'
        await expect(
            page.locator('meta[property="og:image:alt"]'),
        ).toHaveAttribute('content', alt)
        await expect(
            page.locator('meta[name="twitter:image:alt"]'),
        ).toHaveAttribute('content', alt)
    })

    test('JSON-LD is a Person linking the social profiles', async ({
        page,
    }) => {
        await page.goto('/')
        const jsonLd = page.locator('script[type="application/ld+json"]')
        await expect(jsonLd).toHaveCount(1)
        const schema = JSON.parse((await jsonLd.textContent()) ?? '')
        expect(schema).toMatchObject({
            '@type': 'Person',
            name: SITE_NAME,
            jobTitle: 'Principal Web Engineer',
            worksFor: {
                '@type': 'Organization',
                name: CURRENT_EMPLOYER.name,
                url: CURRENT_EMPLOYER.url,
            },
            url: 'https://philipp.fyi/',
        })
        expect(schema.sameAs).toEqual([LINKEDIN_URL, GITHUB_URL])
    })

    test('shows all 4 work cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#work article')
        await expect(cards).toHaveCount(4)
    })

    test('"See all work" CTA on home links to /work/', async ({ page }) => {
        await page.goto('/')
        const link = page.locator('#work a[href="/work/"]')
        await expect(link).toBeVisible()
        await link.click()
        await expect(page).toHaveURL('/work/')
    })

    test('non-featured cards with a cover image show a screenshot', async ({
        page,
    }) => {
        await page.goto('/')
        const withCover = page
            .locator('#work article')
            .filter({ hasText: '8 years of brand evolution on staffbase.com' })
        await expect(withCover.locator('img')).toBeVisible()
    })

    test('shows 6 principle cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#principles article')
        await expect(cards).toHaveCount(6)
    })

    test('shows 6 recommendation cards', async ({ page }) => {
        await page.goto('/')
        const cards = page.locator('#recommendations article')
        await expect(cards).toHaveCount(6)
    })

    test('recommendation names are not clipped at 320px', async ({ page }) => {
        // WCAG 1.4.10 reflow width; the name is a quote's attribution.
        await page.setViewportSize({ width: 320, height: 800 })
        await page.goto('/')
        // Mobile emulation widens the layout viewport if anything overflows.
        expect(
            await page.evaluate(() => document.documentElement.clientWidth),
        ).toBe(320)
        await page.evaluate(async () => {
            await document.fonts.ready
        })
        const names = page.locator('#recommendations article h3')
        await expect(names).toHaveCount(6)
        const clipped = await names.evaluateAll((headings) =>
            headings
                .filter((h) => h.scrollWidth > h.clientWidth)
                .map((h) => h.textContent?.trim()),
        )
        expect(clipped).toEqual([])
    })

    test('card grids are exposed as ordered lists', async ({ page }) => {
        await page.goto('/')
        await expect(
            page.locator('#work ol[role="list"] > li > article'),
        ).toHaveCount(4)
        await expect(
            page.locator('#principles ol[role="list"] > li > article'),
        ).toHaveCount(6)
        await expect(
            page.locator('#recommendations ol[role="list"] > li > article'),
        ).toHaveCount(6)
    })

    test('has no horizontal overflow', async ({ page }) => {
        // A list item wrapper without grid-cols-1 lets truncated card text
        // widen the page past the mobile viewport. Compare against the
        // configured viewport: mobile emulation grows innerWidth to fit.
        await page.goto('/')
        const scrollWidth = await page.evaluate(
            () => document.documentElement.scrollWidth,
        )
        expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width)
    })

    test('contact section is present', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('#contact')).toBeVisible()
    })

    test('a focused card shows only its own ring, not a second title outline (issue #467)', async ({
        page,
    }) => {
        await page.goto('/')
        for (const section of ['#work', '#principles', '#recommendations']) {
            const card = page.locator(`${section} article`).first()
            const title = card.locator('h3 a')
            // Keyboard modality, so focus() matches :focus-visible.
            await page.keyboard.press('Shift')
            await title.focus()
            expect(
                await title.evaluate((el) => el.matches(':focus-visible')),
            ).toBe(true)
            await expect(card).not.toHaveCSS('box-shadow', 'none')
            await expect(title).toHaveCSS('outline-style', 'none')
        }

        // Forced colors drops the ring (a box-shadow), so the title's
        // outline-hidden fallback outline must take over.
        await page.emulateMedia({ forcedColors: 'active' })
        for (const section of ['#work', '#principles', '#recommendations']) {
            const title = page.locator(`${section} article h3 a`).first()
            await page.keyboard.press('Shift')
            await title.focus()
            await expect(title).toHaveCSS('outline-style', 'solid')
            await expect(title).toHaveCSS('outline-width', '2px')
        }
    })

    test('focused controls show the accent ring and keep their own shape (issues #450, #656)', async ({
        page,
    }) => {
        for (const colorScheme of ['light', 'dark'] as const) {
            await page.emulateMedia({ colorScheme })
            await page.goto('/')
            const html = page.locator('html')
            if (colorScheme === 'dark') await expect(html).toHaveClass(/dark/)
            else await expect(html).not.toHaveClass(/dark/)
            const accent = await page.evaluate(() => {
                const probe = document.createElement('span')
                probe.style.color = 'var(--color-accent)'
                document.body.append(probe)
                const color = getComputedStyle(probe).color
                probe.remove()
                return color
            })

            const rounded = [
                page
                    .getByRole('region', { name: 'Introduction' })
                    .locator('a[href*="linkedin.com"]'),
                page.locator('[data-theme-value="dark"]'),
                page.locator('#site-footer a[href*="github.com"]'),
            ]
            for (const control of rounded) {
                const radius = () =>
                    control.evaluate((el) => getComputedStyle(el).borderRadius)
                const resting = await radius()
                expect(parseFloat(resting)).toBeGreaterThan(2)
                await expectFocusRing(control, accent)
                expect(await radius()).toBe(resting)
            }

            // Last: opening the mobile nav makes the rest of the page inert.
            const toggle = page.locator('#nav-toggle')
            if (await toggle.isVisible()) await toggle.click()
            const navLink = page
                .locator('#site-header a[data-nav-link]')
                .filter({ visible: true })
                .first()
            await expectFocusRing(navLink, accent)
        }
    })
})

async function expectFocusRing(control: Locator, accent: string) {
    // Keyboard modality, so focus() matches :focus-visible.
    await control.page().keyboard.press('Shift')
    await control.focus()
    expect(await control.evaluate((el) => el.matches(':focus-visible'))).toBe(
        true,
    )
    // Retrying: transition-colors also animates outline-color.
    await expect(control).toHaveCSS('outline-style', 'solid')
    await expect(control).toHaveCSS('outline-width', '2px')
    await expect(control).toHaveCSS('outline-color', accent)
    await expect(control).toHaveCSS('outline-offset', '3px')
}
