import type { APIRoute } from 'astro'
import { toAbsoluteUrl } from '@/utils/url'

// RFC 9116 recommends Expires under a year out; recomputed each build, so any
// deploy within ~11 months keeps the file valid without a manual bump.
const EXPIRES_IN_DAYS = 330

export const GET: APIRoute = ({ site }) => {
    const expires = new Date(Date.now() + EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000)
    const lines = [
        'Contact: https://github.com/philippstorl/philipp.fyi/security/advisories/new',
        `Contact: ${toAbsoluteUrl('/contact/', site)}`,
        `Expires: ${expires.toISOString()}`,
        'Policy: https://github.com/philippstorl/philipp.fyi/blob/main/SECURITY.md',
        `Canonical: ${toAbsoluteUrl('/.well-known/security.txt', site)}`,
        'Preferred-Languages: en',
    ]

    return new Response(lines.join('\n') + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
