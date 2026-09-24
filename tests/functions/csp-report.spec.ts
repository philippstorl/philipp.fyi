import { expect, test } from '@playwright/test'
import handler from '../../netlify/functions/csp-report'
import { SLACK_WEBHOOK, quietConsole, setEnv, stubFetch } from './helpers'

const ENDPOINT = 'https://philipp.fyi/.netlify/functions/csp-report'
const CONTEXT = { site: { name: 'philipp-fyi' } }
const BLOBS_LINK =
    '*Blobs store:* https://app.netlify.com/projects/philipp-fyi/blobs/site:csp-reports'

const legacyReport = (fields: Record<string, unknown>) => ({
    'csp-report': {
        'document-uri': 'https://philipp.fyi/',
        'violated-directive': 'script-src-elem',
        'blocked-uri': 'https://evil.test/x.js',
        disposition: 'enforce',
        ...fields,
    },
})

let fetchStub: ReturnType<typeof stubFetch>
let logs: ReturnType<typeof quietConsole>
let restoreEnv: () => void

test.beforeEach(() => {
    logs = quietConsole()
    fetchStub = stubFetch()
    restoreEnv = setEnv({ SLACK_WEBHOOK_URL: SLACK_WEBHOOK })
})

test.afterEach(() => {
    fetchStub.restore()
    logs.restore()
    restoreEnv()
})

function post(body: string, headers: Record<string, string> = {}) {
    return handler(
        new Request(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/csp-report', ...headers },
            body,
        }),
        CONTEXT,
    )
}

const blobWrites = () =>
    fetchStub.blobs.filter((request) => request.method === 'PUT')

test('rejects non-POST requests with 405', async () => {
    const response = await handler(new Request(ENDPOINT), CONTEXT)
    expect(response.status).toBe(405)
    expect(fetchStub.blobs).toHaveLength(0)
})

test('rejects an oversized declared Content-Length with 413 before any work', async () => {
    const response = await post('{}', { 'content-length': '50001' })
    expect(response.status).toBe(413)
    expect(fetchStub.blobs).toHaveLength(0)
    expect(fetchStub.slack).toHaveLength(0)
})

test('rejects an oversized body with no Content-Length with 413', async () => {
    const body = JSON.stringify(
        legacyReport({ 'blocked-uri': 'x'.repeat(50_000) }),
    )
    const response = await post(body)
    expect(response.status).toBe(413)
    expect(fetchStub.blobs).toHaveLength(0)
    expect(fetchStub.slack).toHaveLength(0)
})

test('rejects invalid JSON with 400', async () => {
    const response = await post('{not json')
    expect(response.status).toBe(400)
    expect(fetchStub.blobs).toHaveLength(0)
})

test('stores a legacy report-uri report and posts its summary to Slack', async () => {
    const response = await post(JSON.stringify(legacyReport({})), {
        'user-agent': 'TestBrowser/1.0',
    })
    expect(response.status).toBe(204)

    const writes = blobWrites()
    expect(writes).toHaveLength(1)
    expect(writes[0]?.url).toContain('/site:csp-reports/')
    expect(JSON.parse(writes[0]?.body ?? '')).toMatchObject({
        userAgent: 'TestBrowser/1.0',
        report: legacyReport({}),
    })

    const [text] = fetchStub.slackTexts()
    expect(text).toContain('*Directive:* script-src-elem')
    expect(text).toContain('*Blocked:* https://evil.test/x.js')
    expect(text).toContain('*Page:* https://philipp.fyi/')
    expect(text).toContain('*Disposition:* enforce')
    expect(text).toContain(BLOBS_LINK)
})

test('normalizes a Reporting API (report-to) batch', async () => {
    const response = await post(
        JSON.stringify([
            {
                type: 'csp-violation',
                url: 'https://philipp.fyi/work/',
                body: {
                    blockedURL: 'inline',
                    effectiveDirective: 'style-src-attr',
                    disposition: 'report',
                },
            },
        ]),
    )
    expect(response.status).toBe(204)
    const [text] = fetchStub.slackTexts()
    expect(text).toContain('*Directive:* style-src-attr')
    expect(text).toContain('*Blocked:* inline')
    expect(text).toContain('*Page:* https://philipp.fyi/work/')
})

test('escapes Slack mrkdwn and backticks in every attacker-controlled field', async () => {
    await post(
        JSON.stringify(
            legacyReport({
                'violated-directive': '```<!channel>',
                'blocked-uri': '<https://evil.test|Click here>',
                'document-uri': 'a & b',
                disposition: '`x`',
            }),
        ),
    )
    const [text = ''] = fetchStub.slackTexts()
    expect(text).toContain('*Directive:* ˋˋˋ&lt;!channel&gt;')
    expect(text).toContain('*Blocked:* &lt;https://evil.test|Click here&gt;')
    expect(text).toContain('*Page:* a &amp; b')
    expect(text).toContain('*Disposition:* ˋxˋ')
    expect(text).not.toMatch(/[<>]/)
    // Only the JSON block's own fence pair may contain backticks.
    expect(text.match(/```/g)).toHaveLength(2)
    expect(text.replace(/```/g, '')).not.toContain('`')
})

test('drops non-string fields instead of trusting their shape', async () => {
    const response = await post(
        JSON.stringify(
            legacyReport({
                'blocked-uri': { length: 100_000_000 },
                'violated-directive': ['script-src'],
            }),
        ),
    )
    expect(response.status).toBe(204)
    const [text] = fetchStub.slackTexts()
    expect(text).not.toContain('*Blocked:*')
    expect(text).not.toContain('*Directive:*')
    expect(text).toContain('*Page:* https://philipp.fyi/')
})

test('truncates oversized summary fields and the JSON block', async () => {
    await post(
        JSON.stringify(legacyReport({ 'blocked-uri': 'y'.repeat(20_000) })),
    )
    const [text = ''] = fetchStub.slackTexts()
    expect(text).toContain(`*Blocked:* ${'y'.repeat(500)}… (truncated)`)
    expect(text).toContain('\n... (truncated)\n```')
    expect(text.length).toBeLessThan(5_000)
})

test('caps a batch at 25 reports', async () => {
    const batch = Array.from({ length: 40 }, () => legacyReport({}))
    const response = await post(JSON.stringify(batch))
    expect(response.status).toBe(204)
    expect(blobWrites()).toHaveLength(25)
    expect(fetchStub.slack).toHaveLength(25)
    expect(logs.warnings).toEqual([
        ['Truncating CSP report batch: received 40, processing first 25'],
    ])
})

test('falls back to compact JSON for a deeply nested report', async () => {
    let nested: unknown = 'leaf'
    for (let i = 0; i < 50; i++) nested = [nested]
    const response = await post(JSON.stringify(legacyReport({ nested })))
    expect(response.status).toBe(204)
    const [text = ''] = fetchStub.slackTexts()
    // Pretty-printing indentation grows with depth (issue #331's ~1GB blowup).
    expect(text).toContain('```\n{"receivedAt":')
    expect(text).toContain('[[[[[[[[[[')
})

test('a malformed report in a batch does not stop its siblings', async () => {
    const response = await post(JSON.stringify([null, legacyReport({})]))
    expect(response.status).toBe(204)
    expect(blobWrites()).toHaveLength(2)
    const texts = fetchStub.slackTexts()
    expect(texts).toHaveLength(1)
    expect(texts[0]).toContain('*Blocked:* https://evil.test/x.js')
    expect(logs.errors.map(([message]) => message)).toEqual([
        'Failed to summarize CSP report',
    ])
})

test('omits the Blobs link when the write failed', async () => {
    fetchStub.restore()
    fetchStub = stubFetch({ blobsWriteStatus: 403 })
    const response = await post(JSON.stringify(legacyReport({})))
    expect(response.status).toBe(204)
    const [text] = fetchStub.slackTexts()
    expect(text).toContain('*Blocked:* https://evil.test/x.js')
    expect(text).not.toContain('*Blobs store:*')
})

test('skips Slack but still stores the report when no webhook is configured', async () => {
    delete process.env.SLACK_WEBHOOK_URL
    const response = await post(JSON.stringify(legacyReport({})))
    expect(response.status).toBe(204)
    expect(blobWrites()).toHaveLength(1)
    expect(fetchStub.slack).toHaveLength(0)
})
