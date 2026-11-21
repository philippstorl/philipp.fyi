import { execFileSync } from 'child_process'
import fs from 'fs'
import { resolve } from 'path'
import tty from 'tty'

// additionalContext on Stop continues the turn; nudge once, not on every continuation.
// tty.isatty, not process.stdin.isTTY: touching process.stdin makes a pipe non-blocking (EAGAIN).
let continuation = false
if (!tty.isatty(0)) {
    try {
        const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
        continuation = Boolean(input?.stop_hook_active)
    } catch {
        process.exit(0)
    }
}

let cwd = process.cwd()
const tryGit = (...args) => {
    try {
        return execFileSync('git', args, {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        })
    } catch {
        return null
    }
}
// Prefer the cwd's tree (it may be a worktree); fall back to this script's repo when
// Claude has `cd`'d outside any repo. Run from the toplevel so every path is root-relative.
const toplevel = () => tryGit('rev-parse', '--show-toplevel')?.trim()
let root = toplevel()
if (!root) {
    cwd = resolve(import.meta.dirname, '..')
    root = toplevel()
}
if (!root) process.exit(0)
cwd = root

// Commits since the last stop count too, so committing as you go still nudges once
// (issue #662). The record is per-worktree and untracked; HEAD is null before a first commit.
const head = tryGit('rev-parse', '--verify', '-q', 'HEAD')?.trim()
const headFile = tryGit('rev-parse', '--git-path', 'doc-sync-last-head')?.trim()
let lastHead
try {
    lastHead = fs.readFileSync(resolve(cwd, headFile), 'utf8').trim()
} catch {}
if (head && headFile && head !== lastHead) {
    try {
        fs.writeFileSync(resolve(cwd, headFile), `${head}\n`)
    } catch {}
}
// A continuation follows this hook's own nudge, so its commits count as nudged.
if (continuation) process.exit(0)

const changed = []
// -z: unquoted paths, renames as separate "new\0old" fields. -uall: files inside untracked dirs.
const status = tryGit('status', '--porcelain', '-z', '-uall') ?? ''
const fields = status.split('\0')
for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    if (!field) continue
    const code = field.slice(0, 2)
    changed.push({ path: field.slice(3), removed: code.includes('D') })
    if (/[RC]/.test(code)) changed.push({ path: fields[++i], removed: true })
}

// No record yet: don't nudge for history. First-parent, no merges: a `git merge main`
// doesn't count main's commits. An amended record (same parents, off every local branch,
// unlike a sibling branch's tip): only what the amend changed. Any other move (rebase,
// branch switch) is skipped: those commits were already seen or predate the session.
let committed = null
if (head && lastHead && head !== lastHead) {
    const parents = (sha) => tryGit('rev-parse', `${sha}^@`)
    const amended = () =>
        parents(lastHead) !== null &&
        parents(lastHead) === parents(head) &&
        tryGit('for-each-ref', '--contains', lastHead, 'refs/heads') === ''
    if (tryGit('merge-base', '--is-ancestor', lastHead, head) !== null) {
        committed = tryGit(
            'log',
            '--first-parent',
            '--no-merges',
            '--name-status',
            '-z',
            '--format=',
            `${lastHead}..${head}`,
        )
    } else if (amended()) {
        committed = tryGit('diff', '--name-status', '-z', lastHead, head)
    }
}
// -z: "M\0path", renames/copies "R100\0old\0new".
const parts = (committed ?? '').split('\0')
for (let i = 0; i < parts.length; i++) {
    const code = parts[i]
    if (!code) continue
    if (/^[RC]/.test(code)) {
        changed.push({ path: parts[++i], removed: true })
        changed.push({ path: parts[++i], removed: false })
    } else {
        changed.push({ path: parts[++i], removed: code === 'D' })
    }
}

const docPattern =
    /(^|\/)(README\.md|CLAUDE\.md)$|^\.claude\/skills\/[^/]+\/SKILL\.md$/
// An allowlist, not "everything but docs + an ignore list": no ignore list anticipates untracked scratch
// files (e.g. a root-level measure.mjs), and each false nudge continues the turn.
const sourcePattern =
    /^(src\/|e2e\/|tests\/|public\/|scripts\/|netlify\/|\.github\/|package\.json$|netlify\.toml$|astro\.config\.mjs$|tsconfig\.json$|eslint\.config\.mjs$|\.prettierrc\.json$|playwright[^/]*\.config\.ts$|\.npmrc$|\.nvmrc$|\.claude\/(skills\/|settings\.json$))/
const sourceChanged = changed.some(
    ({ path }) => path && !docPattern.test(path) && sourcePattern.test(path),
)
// A deleted doc (or a rename's old path) isn't a doc update.
const docsChanged = changed.some(
    ({ path, removed }) => path && !removed && docPattern.test(path),
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
