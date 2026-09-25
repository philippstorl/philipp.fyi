import { test, expect } from '@playwright/test'

test.describe('Privacy policy page', () => {
    test('shows heading and key GDPR disclosures', async ({ page }) => {
        await page.goto('/privacy/')
        await expect(
            page.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Controller' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Your rights' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Site analytics' }),
        ).toBeVisible()
    })

    test('matches what the site actually processes (issues #401-#404)', async ({
        page,
    }) => {
        await page.goto('/privacy/')
        const article = page.locator('article')

        // RUM stays on: per-page-view records, § 25 TDDDG statement (#401).
        await expect(
            page.getByRole('heading', { name: 'Performance monitoring' }),
        ).toBeVisible()
        await expect(article).toContainText('one record per page view')
        await expect(article).toContainText('§ 25(2) Nr. 2 TDDDG')
        await expect(article).not.toContainText('aggregate performance metrics')

        // Slack gets the report with the user agent and is a named recipient (#402).
        await expect(article).toContainText(
            "including your browser's user agent, is also posted to Slack",
        )
        await expect(article).toContainText(
            'The Slack copy is kept only as long as needed',
        )
        await expect(article).toContainText(
            'Slack relies on the EU-U.S. Data Privacy Framework',
        )

        // Contact form: legitimate interest, not consent (#403).
        await expect(article).toContainText(
            'Legal basis: Art. 6(1)(f) GDPR, my legitimate interest in answering messages',
        )
        await expect(article).not.toContainText(/Art\. 6\(1\)\(a\)|7\(3\)/)
        await expect(article).toContainText('Right to object (Art. 21)')

        // Voluntariness, log retention and Netlify Forms metadata (#404).
        await expect(article).toContainText('Using the form is voluntary')
        await expect(article).toContainText(
            'unless statutory retention periods require keeping it longer',
        )
        await expect(article).toContainText(
            "Netlify doesn't publish a fixed period for these logs",
        )
        await expect(article).toContainText(
            "your IP address, your browser's user agent, the page you sent the form from (referrer)",
        )
        await expect(article).toContainText('Akismet')
    })

    test('links to the contact form', async ({ page }) => {
        await page.goto('/privacy/')
        const links = page.locator('article a[href="/contact/"]')
        await expect(links.first()).toBeVisible()
    })

    test('prose links are underlined at rest, not only on hover', async ({
        page,
    }) => {
        await page.goto('/privacy/')
        const links = page.locator('article a')
        expect(await links.count()).toBeGreaterThan(0)
        for (const link of await links.all()) {
            await expect(link).toHaveCSS('text-decoration-line', 'underline')
        }

        // Hovering elsewhere in the article must not strip every link's underline.
        await page.locator('article h2').first().hover()
        await expect(links.first()).toHaveCSS(
            'text-decoration-line',
            'underline',
        )
    })

    test('external links carry the correct href and a new-tab accessible-name suffix', async ({
        page,
    }) => {
        await page.goto('/privacy/')

        const netlifyLinks = page.locator(
            'article a[href="https://www.netlify.com/privacy/"]',
        )
        await expect(netlifyLinks).toHaveCount(3)
        for (const link of await netlifyLinks.all()) {
            await expect(link).toHaveAttribute('target', '_blank')
            await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
            await expect(link).toHaveAccessibleName(/opens in a new tab/)
        }

        const dpaLink = page.locator(
            'article a[href="https://www.datenschutz.sachsen.de/"]',
        )
        await expect(dpaLink).toHaveAttribute('target', '_blank')
        await expect(dpaLink).toHaveAccessibleName(/opens in a new tab/)

        for (const href of [
            'https://automattic.com/privacy/',
            'https://slack.com/trust/privacy/privacy-policy',
            'https://docs.netlify.com/manage/monitoring/real-user-monitoring/',
        ]) {
            const link = page.locator(`article a[href="${href}"]`)
            await expect(link).toHaveAttribute('target', '_blank')
            await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
            await expect(link).toHaveAccessibleName(/opens in a new tab/)
        }
    })

    test('footer Privacy link leads to /privacy/', async ({ page }) => {
        await page.goto('/')
        // Dev toolbar overlay intercepts footer clicks on mobile -- assert href instead.
        await expect(
            page.locator('footer a', { hasText: 'Privacy' }),
        ).toHaveAttribute('href', '/privacy/')
    })

    test('is noindexed but keeps a real canonical link', async ({ page }) => {
        await page.goto('/privacy/')
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
            'content',
            'noindex',
        )
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
            'href',
            'https://philipp.fyi/privacy/',
        )
    })
})
