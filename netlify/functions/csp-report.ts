import { getStore } from '@netlify/blobs'
import { postToSlack, truncateForSlack } from './_shared/slack'

interface NormalizedViolation {
    documentUri?: string
    blockedUri?: string
    violatedDirective?: string
    disposition?: string
}

// Not imported from @netlify/functions — that's only a transitive
// devDependency of netlify-cli, same risk verify-netlify-signature.ts avoids.
interface FunctionContext {
    site?: { name?: string }
}

// Defensive caps: every field here is attacker-controlled input echoed into Slack.
const MAX_JSON_BLOCK_LENGTH = 3500
const MAX_FIELD_LENGTH = 500

// Caps on the request itself: unauthenticated, so bound one POST's blast
// radius. A real report runs well under 2KB, so 50KB/25 leaves headroom.
const MAX_BODY_BYTES = 50_000
const MAX_REPORTS_PER_REQUEST = 25

function blobsStoreUrl(
    context: FunctionContext | undefined,
): string | undefined {
    return context?.site?.name
        ? `https://app.netlify.com/projects/${context.site.name}/blobs/site:csp-reports`
        : undefined
}

// Pretty-print indentation grows with depth, so a ~9KB nested-array body
// expands to ~40M chars. Real reports nest 3 levels deep.
const MAX_PRETTY_PRINT_DEPTH = 8

// Iterative, since a 50KB body can nest deeper than the call stack allows.
function exceedsDepth(value: unknown, maxDepth: number): boolean {
    const stack: Array<[unknown, number]> = [[value, 0]]
    let entry: [unknown, number] | undefined
    while ((entry = stack.pop())) {
        const [node, depth] = entry
        if (typeof node !== 'object' || node === null) continue
        if (depth >= maxDepth) return true
        for (const child of Object.values(node)) stack.push([child, depth + 1])
    }
    return false
}

function formatJsonBlock(record: unknown): string {
    const json = exceedsDepth(record, MAX_PRETTY_PRINT_DEPTH)
        ? JSON.stringify(record)
        : JSON.stringify(record, null, 2)
    const body = truncateForSlack(
        json,
        MAX_JSON_BLOCK_LENGTH,
        '\n... (truncated)',
    )
    return `\`\`\`\n${body}\n\`\`\``
}

// Runtime check, not a cast: a non-string (e.g. `{length: 1e8}`) is dropped.
function asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined
}

// Handles both the legacy report-uri shape ({ "csp-report": {...} }) and
// the modern report-to/Reporting API shape ({ type, url, body: {...} }).
function normalize(raw: unknown): NormalizedViolation {
    const record = raw as Record<string, unknown>
    const legacy = record['csp-report'] as Record<string, unknown> | undefined
    const body = (legacy ??
        (record['body'] as Record<string, unknown> | undefined) ??
        record) as Record<string, unknown>

    return {
        documentUri:
            asString(body['document-uri']) ??
            asString(body['documentURL']) ??
            asString(record['url']),
        blockedUri:
            asString(body['blocked-uri']) ?? asString(body['blockedURL']),
        violatedDirective:
            asString(body['violated-directive']) ??
            asString(body['effective-directive']) ??
            asString(body['effectiveDirective']),
        disposition: asString(body['disposition']),
    }
}

function truncateField(value: string): string {
    return truncateForSlack(value, MAX_FIELD_LENGTH, '… (truncated)')
}

function summarize(
    violation: NormalizedViolation,
    record: unknown,
    blobsUrl: string | undefined,
): string {
    return [
        ':rotating_light: CSP violation on philipp.fyi',
        violation.violatedDirective
            ? `*Directive:* ${truncateField(violation.violatedDirective)}`
            : null,
        violation.blockedUri
            ? `*Blocked:* ${truncateField(violation.blockedUri)}`
            : null,
        violation.documentUri
            ? `*Page:* ${truncateField(violation.documentUri)}`
            : null,
        violation.disposition
            ? `*Disposition:* ${truncateField(violation.disposition)}`
            : null,
        blobsUrl ? `*Blobs store:* ${blobsUrl}` : null,
        formatJsonBlock(record),
    ]
        .filter((line) => line !== null)
        .join('\n')
}

// Unauthenticated by design -- hit directly by browsers, not a signed webhook.
export default async (
    req: Request,
    context: FunctionContext,
): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    // Rejects an honest oversized POST before buffering it; an absent/lied
    // Content-Length still gets fully read before the byte-length recheck below.
    const contentLength = req.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
        console.warn(
            `Rejected CSP report POST: Content-Length ${contentLength} exceeds ${MAX_BODY_BYTES}-byte cap`,
        )
        return new Response('Payload Too Large', { status: 413 })
    }

    let bodyBuffer: ArrayBuffer
    try {
        bodyBuffer = await req.arrayBuffer()
    } catch {
        return new Response('Invalid request body', { status: 400 })
    }

    // Raw bytes, not a decoded string: invalid sequences collapse to U+FFFD
    // on decode, which can make a re-encoded length undercount.
    if (bodyBuffer.byteLength > MAX_BODY_BYTES) {
        console.warn(
            `Rejected CSP report POST: body exceeds ${MAX_BODY_BYTES}-byte cap`,
        )
        return new Response('Payload Too Large', { status: 413 })
    }

    let payload: unknown
    try {
        payload = JSON.parse(Buffer.from(bodyBuffer).toString('utf8'))
    } catch {
        return new Response('Invalid JSON body', { status: 400 })
    }

    const allReports = Array.isArray(payload) ? payload : [payload]
    if (allReports.length > MAX_REPORTS_PER_REQUEST) {
        console.warn(
            `Truncating CSP report batch: received ${allReports.length}, processing first ${MAX_REPORTS_PER_REQUEST}`,
        )
    }
    const reports = allReports.slice(0, MAX_REPORTS_PER_REQUEST)
    const receivedAt = new Date().toISOString()
    const userAgent = req.headers.get('user-agent')
    const blobsUrl = blobsStoreUrl(context)

    const store = getStore('csp-reports')
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    await Promise.all(
        reports.map(async (report) => {
            const record = { receivedAt, userAgent, report }
            let stored = true

            try {
                // Random suffix avoids key collisions when multiple reports land in the same millisecond.
                await store.setJSON(
                    `${receivedAt}-${crypto.randomUUID()}`,
                    record,
                )
            } catch (error) {
                stored = false
                console.error('Failed to write CSP report to Blobs', error)
            }

            if (webhookUrl) {
                try {
                    // Catch here so one malformed report can't abort its siblings.
                    await postToSlack(
                        webhookUrl,
                        // Only link the Blobs store if this record was actually written.
                        summarize(
                            normalize(report),
                            record,
                            stored ? blobsUrl : undefined,
                        ),
                        'Failed to post CSP violation to Slack',
                    )
                } catch (error) {
                    console.error('Failed to summarize CSP report', error)
                }
            }
        }),
    )

    return new Response(null, { status: 204 })
}
