import { getStore } from '@netlify/blobs'

// V2 scheduled function: a `config` export with a cron `schedule`, not a
// netlify.toml [functions."name"] block — confirmed as the supported shape
// for the installed @netlify/functions (5.3.0) by reading its Config type.
// Runs daily at 03:00 UTC, off-hours for this site's traffic.
export const config = {
    schedule: '0 3 * * *',
}

const RETENTION_DAYS = 30
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

// The store has no write cap of its own (csp-report.ts only bounds one
// POST's fan-out) — deleting in bounded batches, not one unbounded
// Promise.all, keeps a backlog run from spiking concurrent Blobs requests.
const DELETE_BATCH_SIZE = 25

// csp-report.ts writes each entry as `${receivedAt}-${uuid}`, where
// receivedAt is Date#toISOString() (always exactly 24 chars) — reusing that
// documented key format lets age be read from the key itself, with no
// per-entry store.get()/getMetadata() call needed.
const ISO_TIMESTAMP_LENGTH = 24

function parseEntryTimestamp(key: string): number | undefined {
    const timestamp = new Date(key.slice(0, ISO_TIMESTAMP_LENGTH)).getTime()
    // An unparseable prefix means the key isn't this store's usual shape —
    // never guess-delete an entry whose age can't be confirmed.
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
