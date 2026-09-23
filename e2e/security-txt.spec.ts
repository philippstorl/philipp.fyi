import { test, expect } from '@playwright/test'

test.describe('security.txt', () => {
    test('serves RFC 9116 fields with a future Expires under a year out', async ({
        request,
    }) => {
        const response = await request.get('/.well-known/security.txt')
        expect(response.ok()).toBe(true)
        expect(response.headers()['content-type']).toContain('text/plain')

        const body = await response.text()
        const contacts = [...body.matchAll(/^Contact: (.+)$/gm)].map(
            (match) => match[1],
        )
        expect(contacts).toEqual([
            'https://github.com/philippstorl/philipp.fyi/security/advisories/new',
            'https://philipp.fyi/contact/',
        ])
        expect(body).toContain(
            'Policy: https://github.com/philippstorl/philipp.fyi/blob/main/SECURITY.md',
        )
        expect(body).toContain(
            'Canonical: https://philipp.fyi/.well-known/security.txt',
        )

        const expires = body.match(/^Expires: (.+)$/m)?.[1]
        if (!expires) throw new Error('security.txt has no Expires field')
        const msUntilExpiry = new Date(expires).getTime() - Date.now()
        expect(msUntilExpiry).toBeGreaterThan(0)
        expect(msUntilExpiry).toBeLessThan(365 * 24 * 60 * 60 * 1000)
    })
})
