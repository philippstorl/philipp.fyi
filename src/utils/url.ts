/** Builds an absolute URL from a path relative to the site's configured
 * `site` URL (astro.config.mjs). Takes the path and site directly rather
 * than the Astro global, so it stays usable wherever an absolute URL is
 * needed — canonical links, OG image URLs, JSON-LD `url`/`image` fields —
 * without threading the whole request context through. */
export function toAbsoluteUrl(path: string, site: URL | undefined): string {
    return new URL(path, site).toString()
}
