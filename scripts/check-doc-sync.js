import { execSync } from 'child_process'

// -z: unquoted paths, renames as separate "new\0old" fields. -uall: files inside untracked dirs.
const fields = execSync('git status --porcelain -z -uall', {
    encoding: 'utf8',
}).split('\0')
const changed = []
for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    if (!field) continue
    const code = field.slice(0, 2)
    changed.push({ path: field.slice(3), removed: code.includes('D') })
    if (/[RC]/.test(code)) changed.push({ path: fields[++i], removed: true })
}

const docPattern =
    /(^|\/)(README\.md|CLAUDE\.md)$|^\.claude\/skills\/[^/]+\/SKILL\.md$/
const sourcePattern =
    /^(src\/|e2e\/|scripts\/|netlify\/|\.github\/|package\.json$|netlify\.toml$|astro\.config\.mjs$|tsconfig\.json$|eslint\.config\.mjs$|playwright[^/]*\.config\.ts$|\.npmrc$|\.nvmrc$|\.claude\/(skills\/|settings\.json$))/
const sourceChanged = changed.some(
    ({ path }) => !docPattern.test(path) && sourcePattern.test(path),
)
// A deleted doc (or a rename's old path) isn't a doc update.
const docsChanged = changed.some(
    ({ path, removed }) => !removed && docPattern.test(path),
)

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
