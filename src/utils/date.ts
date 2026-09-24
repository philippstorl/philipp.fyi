// A date-only YAML value parses as UTC midnight; format in UTC so the day doesn't depend on the build machine's zone.
export function formatBlogDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
