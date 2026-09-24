import { test, expect } from '@playwright/test'

test.describe('favicons', () => {
    test('links an apple-touch-icon in the head', async ({ page }) => {
        await page.goto('/')
        await expect(
            page.locator('link[rel="apple-touch-icon"]'),
        ).toHaveAttribute('href', '/apple-touch-icon.png')
    })

    test('serves a 180x180 PNG apple-touch-icon', async ({ request }) => {
        const response = await request.get('/apple-touch-icon.png')
        expect(response.ok()).toBe(true)
        expect(response.headers()['content-type']).toContain('image/png')

        // IHDR width/height sit at fixed offsets after the 8-byte PNG signature.
        const body = await response.body()
        expect(body.subarray(1, 4).toString('ascii')).toBe('PNG')
        expect(body.readUInt32BE(16)).toBe(180)
        expect(body.readUInt32BE(20)).toBe(180)
    })

    test('serves a real ICO at /favicon.ico, not the 404 page', async ({
        request,
    }) => {
        const response = await request.get('/favicon.ico')
        expect(response.ok()).toBe(true)

        // ICONDIR header: reserved 0, type 1 (icon), then the image count.
        const body = await response.body()
        expect(body.readUInt16LE(0)).toBe(0)
        expect(body.readUInt16LE(2)).toBe(1)
        expect(body.readUInt16LE(4)).toBeGreaterThan(0)
    })
})
