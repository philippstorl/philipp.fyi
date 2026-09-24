import { execSync } from 'child_process'

// -uall lists files inside untracked dirs, so a new skill's SKILL.md isn't collapsed to its dir.
const status = execSync('git status --porcelain -uall', { encoding: 'utf8' })
const changed = status
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    // Staged renames print as "old -> new"; the new path is the one that matters.
    .map((entry) => entry.split(' -> ').pop())

if (changed.length > 0) {
    const docPattern =
        /(^|\/)(README\.md|CLAUDE\.md)$|^\.claude\/skills\/[^/]+\/SKILL\.md$/
    const sourcePattern =
        /^(src\/|e2e\/|scripts\/|netlify\/|\.github\/|package\.json$|netlify\.toml$|astro\.config\.mjs$|tsconfig\.json$|eslint\.config\.mjs$|playwright[^/]*\.config\.ts$|\.npmrc$|\.nvmrc$|\.claude\/(skills\/|settings\.json$))/
    const isDoc = (file) => docPattern.test(file)
    const sourceChanged = changed.some(
        (file) => !isDoc(file) && sourcePattern.test(file),
    )
    const docsChanged = changed.some(isDoc)

    if (sourceChanged && !docsChanged) {
        const message =
            'Source changed without a README.md/CLAUDE.md/SKILL.md update — consider running the doc-sync skill before finishing.'
        console.log(
            JSON.stringify({
                systemMessage: message,
                hookSpecificOutput: {
                    hookEventName: 'Stop',
                    additionalContext: message,
                },
            }),
        )
    }
}
