import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// Netlify signs Outgoing Webhook POSTs with a JWS (HS256) in the
// X-Webhook-Signature header when a secret is configured on the dashboard
// notification: https://docs.netlify.com/deploy/deploy-notifications/
// The JWT payload carries `iss: "netlify"` and `sha256`, the hex digest of
// the raw request body — there's no published client library for this, so
// the three JWT parts are checked by hand rather than pulling in a JWT
// dependency for one narrow use.
export function verifyNetlifySignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string,
): boolean {
    if (!signatureHeader) return false

    const parts = signatureHeader.split('.')
    if (parts.length !== 3) return false
    const [headerB64, payloadB64, signatureB64] = parts

    let header: unknown
    let payload: unknown
    try {
        header = JSON.parse(
            Buffer.from(headerB64, 'base64url').toString('utf8'),
        )
        payload = JSON.parse(
            Buffer.from(payloadB64, 'base64url').toString('utf8'),
        )
    } catch {
        return false
    }

    if (
        typeof header !== 'object' ||
        header === null ||
        (header as Record<string, unknown>)['alg'] !== 'HS256'
    ) {
        return false
    }

    const actualSignature = Buffer.from(signatureB64, 'base64url')

    const expectedSignature = createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest()

    if (
        actualSignature.length !== expectedSignature.length ||
        !timingSafeEqual(actualSignature, expectedSignature)
    ) {
        return false
    }

    if (
        typeof payload !== 'object' ||
        payload === null ||
        (payload as Record<string, unknown>)['iss'] !== 'netlify'
    ) {
        return false
    }

    const claimedSha256 = (payload as Record<string, unknown>)['sha256']
    if (typeof claimedSha256 !== 'string') return false

    const claimedDigest = Buffer.from(claimedSha256, 'hex')
    const actualDigest = createHash('sha256').update(rawBody).digest()

    return (
        claimedDigest.length === actualDigest.length &&
        timingSafeEqual(claimedDigest, actualDigest)
    )
}
