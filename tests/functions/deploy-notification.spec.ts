import { expect, test } from '@playwright/test'
import handler from '../../netlify/functions/deploy-notification'
import {
    SLACK_WEBHOOK,
    quietConsole,
    setEnv,
    signNetlifyWebhook,
    stubFetch,
} from './helpers'

const SECRET = 'test-webhook-secret'
const ENDPOINT = 'https://philipp.fyi/.netlify/functions/deploy-notification'

let fetchStub: ReturnType<typeof stubFetch>
let logs: ReturnType<typeof quietConsole>
let restoreEnv: () => void

test.beforeEach(() => {
    logs = quietConsole()
    fetchStub = stubFetch()
    restoreEnv = setEnv({
        DEPLOY_NOTIFICATION_WEBHOOK_SECRET: SECRET,
        SLACK_DEPLOY_WEBHOOK_URL: SLACK_WEBHOOK,
    })
})

test.afterEach(() => {
    fetchStub.restore()
    logs.restore()
    restoreEnv()
})

function post(body: string, signature?: string | null) {
    const headers: Record<string, string> = {
        'content-type': 'application/json',
    }
    if (signature) headers['x-webhook-signature'] = signature
    return handler(new Request(ENDPOINT, { method: 'POST', headers, body }))
}

function signedPost(payload: unknown) {
    const body = JSON.stringify(payload)
    return post(body, signNetlifyWebhook(body, SECRET))
}

test('rejects non-POST requests with 405', async () => {
    const response = await handler(new Request(ENDPOINT))
    expect(response.status).toBe(405)
    expect(fetchStub.slack).toHaveLength(0)
})

test('fails closed with 401 when no secret is configured', async () => {
    const body = JSON.stringify({ state: 'ready' })
    const signature = signNetlifyWebhook(body, SECRET)
    delete process.env.DEPLOY_NOTIFICATION_WEBHOOK_SECRET
    const response = await post(body, signature)
    expect(response.status).toBe(401)
    expect(fetchStub.slack).toHaveLength(0)
})

test('rejects an unsigned, wrongly signed or tampered POST with 401', async () => {
    const body = JSON.stringify({ state: 'ready', branch: 'main' })
    const tampered = JSON.stringify({ state: 'ready', branch: 'evil' })
    for (const [requestBody, signature] of [
        [body, null],
        [body, signNetlifyWebhook(body, 'wrong-secret')],
        [tampered, signNetlifyWebhook(body, SECRET)],
    ] as const) {
        const response = await post(requestBody, signature)
        expect(response.status).toBe(401)
    }
    expect(fetchStub.slack).toHaveLength(0)
})

test('rejects a validly signed body that is not a JSON object with 400', async () => {
    for (const body of ['not json', 'null', '42']) {
        const response = await post(body, signNetlifyWebhook(body, SECRET))
        expect(response.status, body).toBe(400)
    }
    expect(fetchStub.slack).toHaveLength(0)
})

test('relays a validly signed deploy to Slack with 204', async () => {
    const response = await signedPost({
        id: 'abc123',
        state: 'ready',
        name: 'philipp-fyi',
        context: 'production',
        branch: 'main',
        deploy_ssl_url: 'https://abc123--philipp-fyi.netlify.app',
        admin_url: 'https://app.netlify.com/projects/philipp-fyi',
    })
    expect(response.status).toBe(204)
    expect(fetchStub.slackTexts()).toEqual([
        [
            ':white_check_mark: Deploy succeeded for *philipp-fyi*',
            '*Context:* production',
            '*Branch:* main',
            '*Deploy:* https://abc123--philipp-fyi.netlify.app',
            '*Admin:* https://app.netlify.com/projects/philipp-fyi/deploys/abc123',
        ].join('\n'),
    ])
})

test('reports a failed deploy', async () => {
    await signedPost({ state: 'error', error_message: 'Build script exited' })
    const [text] = fetchStub.slackTexts()
    expect(text).toContain(':x: Deploy failed for *philipp.fyi*')
    expect(text).toContain('*Error:* Build script exited')
})

test('escapes Slack mrkdwn and backticks in attacker-influenced fields', async () => {
    await signedPost({
        state: 'ready',
        branch: '<!channel> ```<https://evil.test|click>` & more',
    })
    const [text] = fetchStub.slackTexts()
    expect(text).toContain(
        '*Branch:* &lt;!channel&gt; ˋˋˋ&lt;https://evil.test|click&gt;ˋ &amp; more',
    )
    expect(text).not.toMatch(/[<>`]/)
})

test('truncates oversized fields and tolerates non-string values', async () => {
    const response = await signedPost({
        state: 'ready',
        branch: 'b'.repeat(10_000),
        context: 12345,
        name: { nested: true },
    })
    expect(response.status).toBe(204)
    const [text] = fetchStub.slackTexts()
    expect(text).toContain(`*Branch:* ${'b'.repeat(500)}… (truncated)`)
    expect(text).toContain('*Context:* 12345')
    expect(text).toContain('Deploy succeeded for *[object Object]*')
})

test('skips Slack but still answers 204 when no webhook is configured', async () => {
    delete process.env.SLACK_DEPLOY_WEBHOOK_URL
    const response = await signedPost({ state: 'ready' })
    expect(response.status).toBe(204)
    expect(fetchStub.slack).toHaveLength(0)
})
