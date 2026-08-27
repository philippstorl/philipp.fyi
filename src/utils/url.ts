/** Absolute URL from a path + site URL -- takes both directly, no request context needed. */
export function toAbsoluteUrl(path: string, site: URL | undefined): string {
    return new URL(path, site).toString()
}
