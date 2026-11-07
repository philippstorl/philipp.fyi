import { type ListResultBlob, type Store, getStore } from '@netlify/blobs'
import { postToSlack, truncateForSlack } from './_shared/slack'

// V2 scheduled function: `config.schedule` cron, not netlify.toml. Daily at 03:00 UTC.
export const config = {
    schedule: '0 3 * * *',
}

const RETENTION_DAYS = 30
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

// Bounded batches, not one Promise.all, avoid spiking concurrent Blobs requests.
const DELETE_BATCH_SIZE = 25

// receivedAt (ISO, 24 chars) prefixes each key -- age is readable from the
// key itself, no per-entry get()/getMetadata() call needed.
const ISO_TIMESTAMP_LENGTH = 24

function parseEntryTimestamp(key: string): number | undefined {
    const timestamp = new Date(key.slice(0, ISO_TIMESTAMP_LENGTH)).getTime()
    // Unparseable prefix -- never guess-delete an unconfirmed entry.
    return Number.isNaN(timestamp) ? undefined : timestamp
}

const MAX_ERROR_LENGTH = 500

// /privacy/ promises this deletion, so a failing run must reach a human, not just the log.
async function alert(text: string): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
        await postToSlack(
            webhookUrl,
            `:warning: CSP report cleanup on philipp.fyi: ${text}`,
            'Failed to post CSP cleanup alert to Slack',
        )
    }
}

export default async (): Promise<Response> => {
    let store: Store
    let blobs: ListResultBlob[]
    try {
        // getStore() throws too when the Blobs context is missing.
        store = getStore('csp-reports')
        blobs = (await store.list()).blobs
    } catch (error) {
        console.error('Failed to list CSP reports for cleanup', error)
        const message = truncateForSlack(
            error instanceof Error ? error.message : String(error),
            MAX_ERROR_LENGTH,
            '… (truncated)',
        )
        await alert(
            `opening or listing the store failed, nothing was deleted.\n*Error:* ${message}`,
        )
        // Rethrow so the run still shows as failed in the function log.
        throw error
    }

    const cutoff = Date.now() - RETENTION_MS
    const expired = blobs.filter((blob) => {
        const timestamp = parseEntryTimestamp(blob.key)
        return timestamp !== undefined && timestamp < cutoff
    })

    let deleted = 0
    let failed = 0
    for (let i = 0; i < expired.length; i += DELETE_BATCH_SIZE) {
        const batch = expired.slice(i, i + DELETE_BATCH_SIZE)
        await Promise.all(
            batch.map(async ({ key }) => {
                try {
                    await store.delete(key)
                    deleted++
                } catch (error) {
                    failed++
                    console.error(
                        `Failed to delete expired CSP report ${key}`,
                        error,
                    )
                }
            }),
        )
    }

    console.log(
        `csp-reports cleanup: ${deleted} deleted, ${failed} failed, ${
            blobs.length - expired.length
        } kept (retention: ${RETENTION_DAYS}d)`,
    )

    if (failed > 0) {
        await alert(
            `${failed} of ${expired.length} expired reports failed to delete and are kept past the ${RETENTION_DAYS}-day retention.`,
        )
    }

    return new Response(null, { status: 204 })
}
