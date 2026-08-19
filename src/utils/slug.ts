export function stripContentExtension(id: string): string {
    return id.replace(/\.mdx?$/, '')
}
