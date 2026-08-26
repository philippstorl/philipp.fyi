// Used directly by recommendations.astro and via PROSE_CONTENT_CLASSES below —
// keeps blockquote styling consistent everywhere quoted text appears.
export const PROSE_BLOCKQUOTE_CLASSES =
    'prose-blockquote:border-accent prose-blockquote:text-muted'

// Full prose-wrapper treatment for CaseStudyLayout.astro/blog/[slug].astro's long-form bodies.
export const PROSE_CONTENT_CLASSES = `prose max-w-none prose-neutral dark:prose-invert prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-a:text-accent prose-a:no-underline hover:prose-a:underline ${PROSE_BLOCKQUOTE_CLASSES} prose-code:font-mono prose-code:text-sm`
