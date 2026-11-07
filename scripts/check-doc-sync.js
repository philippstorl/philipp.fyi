import { execSync } from 'child_process'
import fs from 'fs'
import { dirname, resolve } from 'path'
import tty from 'tty'
import { fileURLToPath } from 'url'

// additionalContext on Stop continues the turn; nudge once, not on every continuation.
// tty.isatty, not process.stdin.isTTY: touching process.stdin makes a pipe non-blocking (EAGAIN).
if (!tty.isatty(0)) {
    try {
        const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
        if (input?.stop_hook_active) process.exit(0)
    } catch {
        process.exit(0)
    }
}

// -z: unquoted paths, renames as separate "new\0old" fields. -uall: files inside untracked dirs.
// Paths are repo-root-relative from any subdirectory. Prefer the cwd's tree (it may be a
// worktree); fall back to this script's repo when Claude has `cd`'d outside any repo.
const gitStatus = (cwd) =>
    execSync('git status --porcelain -z -uall', {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    })
let status
try {
    status = gitStatus(process.cwd())
} catch {
    status = gitStatus(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
}
const fields = status.split('\0')
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
// An allowlist, not "everything but docs + an ignore list": no ignore list anticipates untracked scratch
// files (e.g. a root-level measure.mjs), and each false nudge continues the turn.
const sourcePattern =
    /^(src\/|e2e\/|tests\/|public\/|scripts\/|netlify\/|\.github\/|package\.json$|netlify\.toml$|astro\.config\.mjs$|tsconfig\.json$|eslint\.config\.mjs$|\.prettierrc\.json$|playwright[^/]*\.config\.ts$|\.npmrc$|\.nvmrc$|\.claude\/(skills\/|settings\.json$))/
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
