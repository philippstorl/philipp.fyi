import { getStore } from '@netlify/blobs'

interface NormalizedViolation {
    documentUri?: string
    blockedUri?: string
    violatedDirective?: string
    disposition?: string
}

// Browsers send two incompatible shapes depending on which directive
// delivered the report: legacy `report-uri` wraps a single violation in
// `{ "csp-report": {...} }` (hyphenated keys), while the modern Reporting
// API (`report-to`) sends a batch of `{ type, url, body: {...} }` objects
// (camelCase keys) as an array. Normalize both down to the same shape
// rather than picking one and losing coverage for browsers that only
// support the other.
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

function summarize(violation: NormalizedViolation): string {
    return [
        ':rotating_light: CSP violation on philipp.fyi',
        violation.violatedDirective
            ? `*Directive:* ${violation.violatedDirective}`
            : null,
        violation.blockedUri ? `*Blocked:* ${violation.blockedUri}` : null,
        violation.documentUri ? `*Page:* ${violation.documentUri}` : null,
        violation.disposition
            ? `*Disposition:* ${violation.disposition}`
            : null,
    ]
        .filter((line) => line !== null)
        .join('\n')
}

export default async (req: Request): Promise<Response> => {
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

    const store = getStore('csp-reports')
    await Promise.all(
        reports.map(async (report) => {
            try {
                // crypto.randomUUID() keeps keys unique even when two
                // requests land in the same millisecond (a real CSP-policy
                // regression trips the same violation for many visitors at
                // once) — an index alone would collide and silently
                // overwrite an earlier report under the same key.
                await store.setJSON(`${receivedAt}-${crypto.randomUUID()}`, {
                    receivedAt,
                    userAgent: req.headers.get('user-agent'),
                    report,
                })
            } catch (error) {
                // Don't let a Blobs write failure take down the whole
                // request — the Slack notification below is the fallback
                // signal, and it shouldn't be silently skipped just
                // because storage had a hiccup.
                console.error('Failed to write CSP report to Blobs', error)
            }
        }),
    )

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
        await Promise.all(
            reports.map(async (report) => {
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            text: summarize(normalize(report)),
                        }),
                    })
                } catch (error) {
                    console.error(
                        'Failed to post CSP violation to Slack',
                        error,
                    )
                }
            }),
        )
    }

    return new Response(null, { status: 204 })
}
