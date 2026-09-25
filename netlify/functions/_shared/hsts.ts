// Must match netlify.toml's site-wide value. Its [[headers]] rules skip function
// responses, and a browser replaces its stored HSTS policy with the latest one seen.
export const STRICT_TRANSPORT_SECURITY = 'max-age=31536000; includeSubDomains'

export function withHsts<Args extends unknown[]>(
    handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
    return async (...args) => {
        let response: Response
        try {
            response = await handler(...args)
        } catch (error) {
            // Netlify's own 500 for an uncaught throw would carry its default HSTS.
            console.error('Unhandled function error', error)
            response = new Response('Internal Server Error', { status: 500 })
        }
        response.headers.set(
            'Strict-Transport-Security',
            STRICT_TRANSPORT_SECURITY,
        )
        return response
    }
}
