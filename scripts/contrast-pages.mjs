// Shared between e2e/contrast.spec.ts (the scan) and check-contrast.mjs
// (the aggregator), so the two can't drift apart on which pages/themes are
// supposed to be covered, or on how a result's filename is derived.

// Mirrors the page set the rest of e2e/ already exercises (see the goto()
// calls across e2e/*.spec.ts) rather than inventing a separate route list.
// Each entry's `reportedPath` is what shows up in contrast-allowlist.json
// and the PR comment; `gotoPath` is the URL actually navigated to — they
// differ only for the 404 case, which has to hit a nonexistent route to
// render the 404 page at all.
export const pages = [
    { reportedPath: '/', gotoPath: '/' },
    { reportedPath: '/about/', gotoPath: '/about/' },
    { reportedPath: '/principles/', gotoPath: '/principles/' },
    { reportedPath: '/recommendations/', gotoPath: '/recommendations/' },
    { reportedPath: '/work/', gotoPath: '/work/' },
    { reportedPath: '/blog/', gotoPath: '/blog/' },
    { reportedPath: '/contact/', gotoPath: '/contact/' },
    {
        reportedPath: '/work/brand-evolution/',
        gotoPath: '/work/brand-evolution/',
    },
    {
        reportedPath: '/work/leadership-operating-model/',
        gotoPath: '/work/leadership-operating-model/',
    },
    {
        reportedPath: '/work/storyblok-migration/',
        gotoPath: '/work/storyblok-migration/',
    },
    {
        reportedPath: '/work/voices-conference-website/',
        gotoPath: '/work/voices-conference-website/',
    },
    // Same nonexistent-route convention as e2e/404.spec.ts.
    { reportedPath: '/404', gotoPath: '/this-page-does-not-exist/' },
]

export const themes = ['light', 'dark']

export function resultFileName(reportedPath, theme) {
    return `${reportedPath}__${theme}`.replace(/[^a-z0-9_-]/gi, '_') + '.json'
}

export function expectedResultFileNames() {
    const names = []
    for (const { reportedPath } of pages) {
        for (const theme of themes) {
            names.push(resultFileName(reportedPath, theme))
        }
    }
    return names
}
