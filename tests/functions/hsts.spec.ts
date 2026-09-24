import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import cspReport from '../../netlify/functions/csp-report'
import deployNotification from '../../netlify/functions/deploy-notification'
import {
    STRICT_TRANSPORT_SECURITY,
    withHsts,
} from '../../netlify/functions/_shared/hsts'
import { quietConsole } from './helpers'

const HSTS = 'Strict-Transport-Security'

test('matches the site-wide value in netlify.toml', () => {
    const toml = readFileSync('netlify.toml', 'utf8')
    const values = [
        ...toml.matchAll(/^\s*Strict-Transport-Security\s*=\s*"([^"]+)"/gm),
    ].map((match) => match[1])
    expect(values).toEqual([STRICT_TRANSPORT_SECURITY])
})

test('sets the header, replacing a weaker one from the handler', async () => {
    const wrapped = withHsts(async () => {
        const response = new Response('ok', { status: 201 })
        response.headers.set(HSTS, 'max-age=60')
        return response
    })
    const response = await wrapped()
    expect(response.status).toBe(201)
    expect(await response.text()).toBe('ok')
    expect(response.headers.get(HSTS)).toBe(STRICT_TRANSPORT_SECURITY)
})

test('turns an uncaught throw into its own 500 with the header', async () => {
    const logs = quietConsole()
    try {
        const response = await withHsts(async () => {
            throw new Error('boom')
        })()
        expect(response.status).toBe(500)
        expect(response.headers.get(HSTS)).toBe(STRICT_TRANSPORT_SECURITY)
        expect(logs.errors).toHaveLength(1)
    } finally {
        logs.restore()
    }
})

test('both HTTP functions send it', async () => {
    const logs = quietConsole()
    try {
        const responses = await Promise.all([
            cspReport(
                new Request(
                    'https://philipp.fyi/.netlify/functions/csp-report',
                ),
                { site: { name: 'philipp-fyi' } },
            ),
            deployNotification(
                new Request(
                    'https://philipp.fyi/.netlify/functions/deploy-notification',
                ),
            ),
        ])
        for (const response of responses) {
            expect(response.status).toBe(405)
            expect(response.headers.get(HSTS)).toBe(STRICT_TRANSPORT_SECURITY)
        }
    } finally {
        logs.restore()
    }
})
