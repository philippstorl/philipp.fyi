// Shared by contrast.spec.ts and check-contrast.mjs so coverage/filenames
// can't drift. gotoPath differs from reportedPath only for /404.
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
