/** Builds an absolute URL from a path and the site's configured `site` URL.
 * Takes both directly rather than the Astro global, so it works anywhere
 * an absolute URL is needed without a request context. */
export function toAbsoluteUrl(path: string, site: URL | undefined): string {
    return new URL(path, site).toString()
}
