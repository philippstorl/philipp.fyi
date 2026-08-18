export function stripContentExtension(id: string): string {
    return id.replace(/\.mdx?$/, '')
}

export function formatBlogDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}
