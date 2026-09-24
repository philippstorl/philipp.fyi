import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

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
        expect(body.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true)
        expect(body.readUInt32BE(16)).toBe(180)
        expect(body.readUInt32BE(20)).toBe(180)
    })

    test('apple-touch-icon is a full-bleed square in the tile color', async ({
        request,
    }, testInfo) => {
        test.skip(testInfo.project.name === 'mobile', 'Not viewport-dependent')
        const tileHex = readFileSync('public/favicon.svg', 'utf8').match(
            /<rect[^>]*\sfill="#([0-9A-Fa-f]{6})"/,
        )?.[1]
        expect(tileHex).toBeDefined()
        const tile = (tileHex!.match(/../g) ?? [])
            .map((hex) => parseInt(hex, 16))
            .join(',')

        const body = await (await request.get('/apple-touch-icon.png')).body()
        const { data, info } = await sharp(body)
            .raw()
            .toBuffer({ resolveWithObject: true })
        const pixel = (x: number, y: number) =>
            data
                .subarray(
                    (y * info.width + x) * info.channels,
                    (y * info.width + x + 1) * info.channels,
                )
                .join(',')

        // iOS masks corners itself; a baked-in rounded tile leaves a faint arc.
        const { width, height } = info
        const edges = new Set<string>()
        for (let x = 0; x < width; x++) {
            edges.add(pixel(x, 0)).add(pixel(x, height - 1))
        }
        for (let y = 0; y < height; y++) {
            edges.add(pixel(0, y)).add(pixel(width - 1, y))
        }
        expect(info.channels).toBe(3)
        expect([...edges]).toEqual([tile])
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
        const count = body.readUInt16LE(4)
        expect(count).toBeGreaterThan(0)

        // Each 16-byte directory entry's offset must point at an embedded PNG.
        for (let index = 0; index < count; index++) {
            const offset = body.readUInt32LE(6 + 16 * index + 12)
            const png = body.subarray(offset, offset + 8)
            expect(png.equals(PNG_SIGNATURE)).toBe(true)
        }
    })
})
