import { expect, test } from '@playwright/test'
import handler from '../../netlify/functions/csp-report-cleanup'
import { quietConsole, stubFetch } from './helpers'

const DAY_MS = 24 * 60 * 60 * 1000
const keyAt = (ageDays: number) =>
    `${new Date(Date.now() - ageDays * DAY_MS).toISOString()}-${crypto.randomUUID()}`

test('deletes only entries older than 30 days, in every batch', async () => {
    const expired = Array.from({ length: 60 }, () => keyAt(31))
    const kept = [keyAt(1), keyAt(29), 'not-a-timestamp-key']
    const fetchStub = stubFetch({
        blobsList: [...expired, ...kept].map((key) => ({ key, etag: 'e' })),
    })
    const logs = quietConsole()
    try {
        const response = await handler()
        expect(response.status).toBe(204)
        const deleted = fetchStub.blobs
            .filter((request) => request.method === 'DELETE')
            .map((request) =>
                decodeURIComponent(request.url.split('/').pop() ?? ''),
            )
        expect(deleted.sort()).toEqual([...expired].sort())
    } finally {
        fetchStub.restore()
        logs.restore()
    }
})

test('logs failed deletes and still completes the run', async () => {
    const fetchStub = stubFetch({
        blobsList: [{ key: keyAt(40), etag: 'e' }],
        blobsWriteStatus: 403,
    })
    const logs = quietConsole()
    try {
        const response = await handler()
        expect(response.status).toBe(204)
        expect(logs.errors).toHaveLength(1)
        expect(String(logs.errors[0]?.[0])).toContain(
            'Failed to delete expired CSP report',
        )
    } finally {
        fetchStub.restore()
        logs.restore()
    }
})
