import { expect, test } from '@playwright/test'
import handler, { config } from '../../netlify/functions/csp-report-cleanup'
import { SLACK_WEBHOOK, quietConsole, setEnv, stubFetch } from './helpers'

const DAY_MS = 24 * 60 * 60 * 1000
const keyAt = (ageDays: number) =>
    `${new Date(Date.now() - ageDays * DAY_MS).toISOString()}-${crypto.randomUUID()}`
const entries = (...keys: string[]) => keys.map((key) => ({ key, etag: 'e' }))

let logs: ReturnType<typeof quietConsole>
let restoreEnv: () => void

test.beforeEach(() => {
    logs = quietConsole()
    restoreEnv = setEnv({ SLACK_WEBHOOK_URL: SLACK_WEBHOOK })
})

test.afterEach(() => {
    logs.restore()
    restoreEnv()
})

// A renamed or dropped `schedule` key silently stops Netlify running the job.
test('runs on the daily 03:00 UTC schedule', () => {
    expect(config).toEqual({ schedule: '0 3 * * *' })
})

test('deletes only entries older than 30 days, in every batch, with no alert', async () => {
    const expired = Array.from({ length: 60 }, () => keyAt(31))
    const kept = [keyAt(1), keyAt(29), 'not-a-timestamp-key']
    const fetchStub = stubFetch({ blobsList: entries(...expired, ...kept) })
    try {
        const response = await handler()
        expect(response.status).toBe(204)
        const deleted = fetchStub.blobs
            .filter((request) => request.method === 'DELETE')
            .map((request) =>
                decodeURIComponent(request.url.split('/').pop() ?? ''),
            )
        expect(deleted.sort()).toEqual([...expired].sort())
        expect(fetchStub.slack).toHaveLength(0)
    } finally {
        fetchStub.restore()
    }
})

test('logs failed deletes, alerts Slack once and still completes the run', async () => {
    const fetchStub = stubFetch({
        blobsList: entries(keyAt(40), keyAt(35), keyAt(1)),
        blobsWriteStatus: 403,
    })
    try {
        const response = await handler()
        expect(response.status).toBe(204)
        expect(logs.errors.map(([message]) => String(message))).toEqual([
            expect.stringContaining('Failed to delete expired CSP report'),
            expect.stringContaining('Failed to delete expired CSP report'),
        ])
        expect(fetchStub.slackTexts()).toEqual([
            ':warning: CSP report cleanup on philipp.fyi: 2 of 2 expired reports failed to delete and are kept past the 30-day retention.',
        ])
    } finally {
        fetchStub.restore()
    }
})

test('alerts Slack and rethrows when listing the store fails', async () => {
    const fetchStub = stubFetch({ blobsListStatus: 401 })
    try {
        await expect(handler()).rejects.toThrow('401 status code')
        expect(
            fetchStub.blobs.filter((request) => request.method === 'DELETE'),
        ).toHaveLength(0)
        const texts = fetchStub.slackTexts()
        expect(texts).toHaveLength(1)
        expect(texts[0]).toMatch(
            /^:warning: CSP report cleanup on philipp\.fyi: opening or listing the store failed, nothing was deleted\.\n\*Error:\* .*401 status code/,
        )
        expect(logs.errors.map(([message]) => message)).toEqual([
            'Failed to list CSP reports for cleanup',
        ])
    } finally {
        fetchStub.restore()
    }
})

test('alerts Slack and rethrows when the Blobs context is missing', async () => {
    const fetchStub = stubFetch()
    const restoreContext = setEnv({ NETLIFY_BLOBS_CONTEXT: undefined })
    try {
        await expect(handler()).rejects.toThrow('Netlify Blobs')
        expect(fetchStub.blobs).toHaveLength(0)
        expect(fetchStub.slackTexts()).toEqual([
            expect.stringContaining(
                'opening or listing the store failed, nothing was deleted.',
            ),
        ])
    } finally {
        restoreContext()
        fetchStub.restore()
    }
})

test('escapes Slack mrkdwn in the Blobs error it quotes', async () => {
    const fetchStub = stubFetch({
        blobsListStatus: 403,
        blobsListNfError: '<!channel> <https://evil.test|ok>',
    })
    try {
        await expect(handler()).rejects.toThrow('<!channel>')
        const [text] = fetchStub.slackTexts()
        expect(text).toContain('&lt;!channel&gt; &lt;https://evil.test|ok&gt;')
        expect(text).not.toContain('<')
    } finally {
        fetchStub.restore()
    }
})

test('a Slack 4xx on either alert is logged and does not change the outcome', async () => {
    const deleteStub = stubFetch({
        blobsList: entries(keyAt(40)),
        blobsWriteStatus: 403,
        slackStatus: 404,
    })
    try {
        expect((await handler()).status).toBe(204)
        expect(deleteStub.slack).toHaveLength(1)
    } finally {
        deleteStub.restore()
    }

    const listStub = stubFetch({ blobsListStatus: 401, slackStatus: 404 })
    try {
        await expect(handler()).rejects.toThrow('401 status code')
        expect(listStub.slack).toHaveLength(1)
    } finally {
        listStub.restore()
    }

    expect(
        logs.errors.filter(
            ([message]) =>
                message === 'Failed to post CSP cleanup alert to Slack',
        ),
    ).toHaveLength(2)
})

test('skips Slack when no webhook is configured, for both failure branches', async () => {
    delete process.env.SLACK_WEBHOOK_URL
    const deleteStub = stubFetch({
        blobsList: entries(keyAt(40)),
        blobsWriteStatus: 403,
    })
    try {
        expect((await handler()).status).toBe(204)
        expect(deleteStub.slack).toHaveLength(0)
    } finally {
        deleteStub.restore()
    }

    const listStub = stubFetch({ blobsListStatus: 401 })
    try {
        await expect(handler()).rejects.toThrow('401 status code')
        expect(listStub.slack).toHaveLength(0)
    } finally {
        listStub.restore()
    }

    // stubFetch throws on any other URL, which postToSlack would log here.
    expect(logs.errors.map(([message]) => message)).not.toContain(
        'Failed to post CSP cleanup alert to Slack',
    )
})
