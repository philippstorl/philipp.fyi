import type { APIRoute } from 'astro'

// This endpoint runs at build time and outputs a static /build.txt file.
// Useful for quickly verifying which build is deployed.
//
// Netlify sets the following environment variables during build:
//   CONTEXT    — "production" | "deploy-preview" | "branch-deploy"
//   HEAD       — branch name (e.g. "main")
//   COMMIT_REF — full git commit SHA
//
// In local dev these will be undefined; the fallback values make that clear.
export const GET: APIRoute = () => {
    const lines = [
        `LAST BUILD: ${new Date().toISOString()}`,
        `ENV:        ${import.meta.env.MODE}`,
        `CONTEXT:    ${process.env.CONTEXT    ?? 'local'}`,
        `BRANCH:     ${process.env.HEAD        ?? 'unknown'}`,
        `COMMIT:     ${process.env.COMMIT_REF  ?? 'unknown'}`,
    ]

    return new Response(lines.join('\n') + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
