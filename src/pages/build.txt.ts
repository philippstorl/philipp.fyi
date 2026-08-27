import type { APIRoute } from 'astro'

// Static /build.txt for verifying the live deploy. Netlify env vars: CONTEXT,
// HEAD (branch), COMMIT_REF (SHA) -- undefined locally, hence the fallbacks.
export const GET: APIRoute = () => {
    const lines = [
        `LAST BUILD: ${new Date().toISOString()}`,
        `ENV:        ${import.meta.env.MODE}`,
        `CONTEXT:    ${process.env.CONTEXT ?? 'local'}`,
        `BRANCH:     ${process.env.HEAD ?? 'unknown'}`,
        `COMMIT:     ${process.env.COMMIT_REF ?? 'unknown'}`,
    ]

    return new Response(lines.join('\n') + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
