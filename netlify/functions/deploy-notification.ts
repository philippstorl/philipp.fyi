import { postToSlack, truncateForSlack } from './_shared/slack'
import { verifyNetlifySignature } from './_shared/verify-netlify-signature'

interface DeployNotification {
    id?: string
    state?: string
    context?: string
    branch?: string
    error_message?: string
    deploy_ssl_url?: string
    admin_url?: string
    name?: string
}

// The payload is a signed Netlify webhook (verified below), but fields like
// `branch` still ultimately come from a git branch name a repo contributor
// chose — same Slack mrkdwn injection risk as csp-report.ts's fields, so the
// same field-length cap applies here.
const MAX_FIELD_LENGTH = 500

// `payload` is only cast to DeployNotification (deploy-notification.ts's
// export default), not runtime-validated per field, so a malformed/future
// payload shape could hand this a non-string — coerce rather than let
// sanitizeSlackText's string methods throw and fail the whole invocation.
function sanitizeField(value: unknown): string {
    return truncateForSlack(String(value), MAX_FIELD_LENGTH, '… (truncated)')
}

// admin_url is the site's general admin page (e.g. https://app.netlify.com/projects/<site>),
// not the specific deploy — appending /deploys/<id> is what links to the actual deploy.
function deployAdminUrl(deploy: DeployNotification): string | undefined {
    if (!deploy.admin_url) return undefined
    return deploy.id
        ? `${deploy.admin_url}/deploys/${deploy.id}`
        : deploy.admin_url
}

function summarize(deploy: DeployNotification): string {
    const failed = deploy.state === 'error' || Boolean(deploy.error_message)
    const site = deploy.name ? sanitizeField(deploy.name) : 'philipp.fyi'
    const adminUrl = deployAdminUrl(deploy)

    return [
        failed
            ? `:x: Deploy failed for *${site}*`
            : `:white_check_mark: Deploy succeeded for *${site}*`,
        deploy.context ? `*Context:* ${sanitizeField(deploy.context)}` : null,
        deploy.branch ? `*Branch:* ${sanitizeField(deploy.branch)}` : null,
        deploy.error_message
            ? `*Error:* ${sanitizeField(deploy.error_message)}`
            : null,
        deploy.deploy_ssl_url
            ? `*Deploy:* ${sanitizeField(deploy.deploy_ssl_url)}`
            : null,
        adminUrl ? `*Admin:* ${sanitizeField(adminUrl)}` : null,
    ]
        .filter((line) => line !== null)
        .join('\n')
}

export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    const secret = process.env.DEPLOY_NOTIFICATION_WEBHOOK_SECRET
    if (!secret) {
        console.error(
            'DEPLOY_NOTIFICATION_WEBHOOK_SECRET is not configured; rejecting deploy notification',
        )
        return new Response('Unauthorized', { status: 401 })
    }

    let rawBody: string
    try {
        rawBody = await req.text()
    } catch {
        return new Response('Invalid request body', { status: 400 })
    }

    if (
        !verifyNetlifySignature(
            rawBody,
            req.headers.get('x-webhook-signature'),
            secret,
        )
    ) {
        console.error(
            'Deploy notification signature verification failed; rejecting request',
        )
        return new Response('Unauthorized', { status: 401 })
    }

    let payload: unknown
    try {
        payload = JSON.parse(rawBody)
    } catch {
        return new Response('Invalid JSON body', { status: 400 })
    }

    if (typeof payload !== 'object' || payload === null) {
        return new Response('Invalid JSON body', { status: 400 })
    }

    const webhookUrl = process.env.SLACK_DEPLOY_WEBHOOK_URL
    if (webhookUrl) {
        await postToSlack(
            webhookUrl,
            summarize(payload as DeployNotification),
            'Failed to post deploy notification to Slack',
        )
    }

    return new Response(null, { status: 204 })
}
