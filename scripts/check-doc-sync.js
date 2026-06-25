import { execSync } from 'child_process'

const status = execSync('git status --porcelain', { encoding: 'utf8' })
const changed = status
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)

if (changed.length > 0) {
    const sourcePattern =
        /^(src\/|e2e\/|scripts\/|package\.json$|netlify\.toml$|astro\.config\.mjs$|\.github\/workflows\/|\.claude\/(skills\/|settings\.json$))/
    const sourceChanged = changed.some((file) => sourcePattern.test(file))
    const docsChanged = changed.some(
        (file) => file === 'README.md' || file === 'CLAUDE.md',
    )

    if (sourceChanged && !docsChanged) {
        const message =
            'Source changed without a README.md/CLAUDE.md update — consider running the doc-sync skill before finishing.'
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
