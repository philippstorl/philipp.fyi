import { createHash, createHmac } from 'node:crypto'

export const SLACK_WEBHOOK = 'https://hooks.slack.test/webhook'
const BLOBS_EDGE_URL = 'https://blobs.test'

export interface RecordedRequest {
    url: string
    method: string
    body: string
}

// Sets env vars (undefined unsets) and returns a restore to the previous values,
// since Playwright reuses one worker process across spec files.
export function setEnv(vars: Record<string, string | undefined>) {
    const previous = Object.fromEntries(
        Object.keys(vars).map((name) => [name, process.env[name]]),
    )
    const apply = (values: Record<string, string | undefined>) => {
        for (const [name, value] of Object.entries(values)) {
            if (value === undefined) delete process.env[name]
            else process.env[name] = value
        }
    }
    apply(vars)
    return () => apply(previous)
}

// Captures the handlers' expected console output so passing runs stay readable.
export function quietConsole() {
    const original = {
        error: console.error,
        warn: console.warn,
        log: console.log,
    }
    const errors: unknown[][] = []
    const warnings: unknown[][] = []
    console.error = (...args: unknown[]) => void errors.push(args)
    console.warn = (...args: unknown[]) => void warnings.push(args)
    console.log = () => {}
    return {
        errors,
        warnings,
        restore: () => Object.assign(console, original),
    }
}

interface FetchStubOptions {
    // Fail writes with a 4xx, not a 5xx: @netlify/blobs retries 5xx/429 after real sleeps.
    blobsWriteStatus?: number
    blobsList?: Array<{ key: string; etag: string }>
}

// Replaces global fetch for the Slack webhook and the Blobs edge API, so no
// test ever reaches the network (or the real, dashboard-configured webhooks).
export function stubFetch(options: FetchStubOptions = {}) {
    const original = globalThis.fetch
    const slack: RecordedRequest[] = []
    const blobs: RecordedRequest[] = []

    const restoreEnv = setEnv({
        NETLIFY_BLOBS_CONTEXT: Buffer.from(
            JSON.stringify({
                siteID: 'test-site',
                token: 'test-token',
                edgeURL: BLOBS_EDGE_URL,
            }),
        ).toString('base64'),
    })

    globalThis.fetch = async (input, init) => {
        const url = String(input instanceof Request ? input.url : input)
        const method = (init?.method ?? 'GET').toUpperCase()
        const body = typeof init?.body === 'string' ? init.body : ''
        if (url === SLACK_WEBHOOK) {
            slack.push({ url, method, body })
            return new Response('ok', { status: 200 })
        }
        if (url.startsWith(BLOBS_EDGE_URL)) {
            blobs.push({ url, method, body })
            if (method === 'GET') {
                return Response.json({
                    blobs: options.blobsList ?? [],
                    directories: [],
                })
            }
            return new Response(null, {
                status: options.blobsWriteStatus ?? 200,
            })
        }
        throw new Error(`Unexpected fetch in test: ${method} ${url}`)
    }

    return {
        slack,
        blobs,
        slackTexts: () =>
            slack.map((request) => JSON.parse(request.body).text as string),
        restore: () => {
            globalThis.fetch = original
            restoreEnv()
        },
    }
}

const base64url = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')

// Builds an X-Webhook-Signature the way Netlify does: HS256 JWS whose payload
// carries iss "netlify" and the raw body's SHA-256 hex digest.
export function signNetlifyWebhook(
    rawBody: string,
    secret: string,
    overrides: { header?: object; payload?: object } = {},
): string {
    const header = base64url({ alg: 'HS256', typ: 'JWT', ...overrides.header })
    const payload = base64url({
        iss: 'netlify',
        sha256: createHash('sha256').update(rawBody).digest('hex'),
        ...overrides.payload,
    })
    const signature = createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url')
    return `${header}.${payload}.${signature}`
}
