// Used directly by recommendations.astro, and composed into PROSE_CONTENT_CLASSES
// below for CaseStudyLayout.astro/blog/[slug].astro — keeps the accent-colored
// blockquote treatment consistent wherever quoted text appears.
export const PROSE_BLOCKQUOTE_CLASSES =
    'prose-blockquote:border-accent prose-blockquote:text-muted'

// Shared with CaseStudyLayout.astro and blog/[slug].astro — the full prose-wrapper
// treatment (headings, links, blockquotes, code) for a long-form content body.
export const PROSE_CONTENT_CLASSES = `prose max-w-none prose-neutral dark:prose-invert prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-a:text-accent prose-a:no-underline hover:prose-a:underline ${PROSE_BLOCKQUOTE_CLASSES} prose-code:font-mono prose-code:text-sm`
