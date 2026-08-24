import { getStore } from '@netlify/blobs'
import { postToSlack } from './_shared/slack'

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

function blobsStoreUrl(
    context: FunctionContext | undefined,
): string | undefined {
    return context?.site?.name
        ? `https://app.netlify.com/projects/${context.site.name}/blobs/site:csp-reports`
        : undefined
}

// Endpoint is unauthenticated, so every field is attacker-controlled: escape
// Slack mrkdwn (&, <, >) so a crafted value can't inject a mention or a
// spoofed link, and neutralize backticks so it can't break a code fence.
function sanitizeSlackText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`/g, 'ˋ')
}

// Truncates by code point, not `.slice()` (can split a surrogate pair), and
// before sanitizing (can't cut mid-entity, e.g. inside `&amp;`).
function truncateForSlack(
    text: string,
    maxLength: number,
    marker: string,
): string {
    const codePoints = Array.from(text)
    if (codePoints.length <= maxLength) return sanitizeSlackText(text)
    return sanitizeSlackText(codePoints.slice(0, maxLength).join('')) + marker
}

function formatJsonBlock(record: unknown): string {
    const json = JSON.stringify(record, null, 2)
    const body = truncateForSlack(
        json,
        MAX_JSON_BLOCK_LENGTH,
        '\n... (truncated)',
    )
    return `\`\`\`\n${body}\n\`\`\``
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
        documentUri: (body['document-uri'] ??
            body['documentURL'] ??
            record['url']) as string | undefined,
        blockedUri: (body['blocked-uri'] ?? body['blockedURL']) as
            string | undefined,
        violatedDirective: (body['violated-directive'] ??
            body['effective-directive'] ??
            body['effectiveDirective']) as string | undefined,
        disposition: body['disposition'] as string | undefined,
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

// No X-Webhook-Signature check, unlike deploy-notification.ts: this is hit
// directly by browsers, not a signed Netlify webhook — unauthenticated by
// design, same as any CSP reporting endpoint (see issue #157).
export default async (
    req: Request,
    context: FunctionContext,
): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    let payload: unknown
    try {
        payload = await req.json()
    } catch {
        return new Response('Invalid JSON body', { status: 400 })
    }

    const reports = Array.isArray(payload) ? payload : [payload]
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
                    // normalize()/summarize() can throw on a malformed
                    // report — catch here so one bad report in a batch
                    // can't abort its siblings.
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
