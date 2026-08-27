import { getStore } from '@netlify/blobs'

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

export default async (): Promise<Response> => {
    const store = getStore('csp-reports')
    const { blobs } = await store.list()

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

    return new Response(null, { status: 204 })
}
