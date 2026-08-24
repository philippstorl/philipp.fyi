import { getStore } from '@netlify/blobs'
import { postToSlack } from './_shared/slack'

interface NormalizedViolation {
    documentUri?: string
    blockedUri?: string
    violatedDirective?: string
    disposition?: string
}

// Deliberately not imported from `@netlify/functions` (a transitive
// devDependency of netlify-cli only, not a direct dependency — see
// verify-netlify-signature.ts's comment on the same risk) — this is the one
// field this function actually reads off the real Context object.
interface FunctionContext {
    site?: { name?: string }
}

// Slack's message text limit is far higher than either of these, but a CSP
// report's fields are attacker-influenced input echoed back into a chat
// message — cap them defensively rather than trust they're always small.
const MAX_JSON_BLOCK_LENGTH = 3500
const MAX_FIELD_LENGTH = 500

function blobsStoreUrl(
    context: FunctionContext | undefined,
): string | undefined {
    return context?.site?.name
        ? `https://app.netlify.com/projects/${context.site.name}/blobs/site:csp-reports`
        : undefined
}

// This endpoint is unauthenticated by design (see the comment on the
// handler below), so every field reaching this function is attacker-
// controlled — both the four summary lines below and the JSON block. Slack's
// mrkdwn parser treats `&`, `<`, `>` as live syntax (link/mention delimiters)
// wherever they appear, so they must be escaped per Slack's own API docs
// before any user-influenced text is sent — otherwise a crafted report could
// inject a `<!channel>` mention or a spoofed `<url|label>` link. A literal
// run of backticks is neutralized the same way everywhere this function is
// used, not just inside the JSON code block: three backticks in an inline
// summary line can pair with the JSON block's own opening fence and scramble
// every line in between, even though it can't itself deliver a live mention —
// confirmed by manually posting a crafted report through a local Netlify Dev
// instance and inspecting the exact payload that reached the webhook.
function sanitizeSlackText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`/g, 'ˋ')
}

// Truncates by Unicode code point, not raw `.slice()` (which counts UTF-16
// code units and can split a surrogate pair in two), and runs before
// sanitizing so the cut can't land mid-entity inside a `&amp;`/`&lt;`/`&gt;`
// sequence that sanitizing would otherwise introduce.
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

// No X-Webhook-Signature check here, unlike deploy-notification.ts: this
// endpoint is hit directly by browsers via the CSP report-to/report-uri
// directives, not by a Netlify Outgoing Webhook notification, so there's no
// Netlify-signed JWS to verify — the endpoint is unauthenticated by design,
// same as any CSP reporting endpoint on the web (see issue #157).
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
                    // normalize()/summarize() have no guard of their own —
                    // a malformed report (e.g. `null`, or a shape neither
                    // normalize() branch expects) can throw synchronously.
                    // Catch it here so one bad report in a batch can't
                    // reject this whole task and abort its sibling reports'
                    // processing along with it.
                    await postToSlack(
                        webhookUrl,
                        // Only point at the Blobs store if this record
                        // actually made it there — otherwise the link would
                        // send someone looking for an entry that was never
                        // written.
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
