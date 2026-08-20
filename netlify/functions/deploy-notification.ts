import { postToSlack } from './_shared/slack'

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
    const site = deploy.name ?? 'philipp.fyi'
    const adminUrl = deployAdminUrl(deploy)

    return [
        failed
            ? `:x: Deploy failed for *${site}*`
            : `:white_check_mark: Deploy succeeded for *${site}*`,
        deploy.context ? `*Context:* ${deploy.context}` : null,
        deploy.branch ? `*Branch:* ${deploy.branch}` : null,
        deploy.error_message ? `*Error:* ${deploy.error_message}` : null,
        deploy.deploy_ssl_url ? `*Deploy:* ${deploy.deploy_ssl_url}` : null,
        adminUrl ? `*Admin:* ${adminUrl}` : null,
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
