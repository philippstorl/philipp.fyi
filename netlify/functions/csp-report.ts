import { getStore } from '@netlify/blobs'
import { postToSlack } from './_shared/slack'

interface NormalizedViolation {
    documentUri?: string
    blockedUri?: string
    violatedDirective?: string
    disposition?: string
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
                // Random suffix avoids key collisions when multiple reports land in the same millisecond.
                await store.setJSON(`${receivedAt}-${crypto.randomUUID()}`, {
                    receivedAt,
                    userAgent: req.headers.get('user-agent'),
                    report,
                })
            } catch (error) {
                console.error('Failed to write CSP report to Blobs', error)
            }
        }),
    )

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
        await Promise.all(
            reports.map((report) =>
                postToSlack(
                    webhookUrl,
                    summarize(normalize(report)),
                    'Failed to post CSP violation to Slack',
                ),
            ),
        )
    }

    return new Response(null, { status: 204 })
}
