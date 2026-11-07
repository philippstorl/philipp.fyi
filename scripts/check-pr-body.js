import fs from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'
import tty from 'tty'
import { fileURLToPath } from 'url'

// PreToolUse hook: blocks `gh pr create`/`gh pr edit` when the body breaks the
// conventional-commits skill's "PR description" structure. Exit 2 blocks the call
// and shows stderr to Claude; anything it can't read or parse is let through.

const GH_PR_WRITE = /\bgh\s+pr\s+(?:create|edit)\b/g
const BODY_FILE =
    /\s(?:--body-file|-F)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s;&|)]+))/
const INLINE_BODY = /\s(?:--body|-b)(?:=|\s+)/
const HEREDOC =
    /<<-?\s*(['"]?)(\w+)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?:\n|$)/
// `--body "$(cat path)"` is read; any other `$` in an inline body can't be resolved here.
const CAT_SUBSTITUTION =
    /^"?\$\(cat\s+(?:"([^"]+)"|'([^']+)'|([^\s<)]\S*?))\s*\)/
const CD =
    /(?:^|&&|;|\n)\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))\s*(?=&&|;|\n)/g

const expandHome = (path) => path.replace(/^~(?=\/|$)/, homedir())

// True when `index` sits outside any quotes (enough to skip `gh pr` quoted in a commit message).
function isUnquoted(command, index) {
    let quote = null
    for (let i = 0; i < index; i++) {
        const char = command[i]
        if (quote === "'") {
            if (char === "'") quote = null
        } else if (char === '\\') {
            i++
        } else if (quote === '"') {
            if (char === '"') quote = null
        } else if (char === "'" || char === '"') {
            quote = char
        }
    }
    return quote === null
}

// Returns the PR body the command would send, or null when it sends none
// (e.g. `gh pr edit --add-label`) or the hook can't tell what it would be.
export function extractBody(command, cwd) {
    const match = [...command.matchAll(GH_PR_WRITE)].find((m) =>
        isUnquoted(command, m.index),
    )
    if (!match) return null
    const before = command.slice(0, match.index)
    const segment = command.slice(match.index)
    for (const cd of before.matchAll(CD)) {
        cwd = resolve(cwd, expandHome(cd[1] ?? cd[2] ?? cd[3]))
    }
    const read = (path) =>
        fs.readFileSync(resolve(cwd, expandHome(path)), 'utf8')

    const file = segment.match(BODY_FILE)
    if (file) {
        const path = file[1] ?? file[2] ?? file[3]
        return path === '-' ? null : read(path)
    }
    const inline = segment.match(INLINE_BODY)
    if (!inline) return null
    const value = segment.slice(inline.index + inline[0].length)
    const heredoc = value.match(HEREDOC)
    if (heredoc && value.startsWith('"$(cat')) return heredoc[3]
    const cat = value.match(CAT_SUBSTITUTION)
    if (cat) return read(cat[1] ?? cat[2] ?? cat[3])
    if (value.startsWith("'")) return value.slice(1)
    if (value.startsWith('"') && !value.includes('$')) return value.slice(1)
    return null
}

export function findBodyProblems(body) {
    const problems = []
    const link = body.match(
        /^(?:Resolves|Relates to|Fixes|Closes) #(\d+)[ \t]*$/m,
    )
    if (link) {
        const next = body
            .slice(link.index + link[0].length)
            .split('\n')
            .map((line) => line.trim())
            .find(Boolean)
        if (next !== `- #${link[1]}`) {
            problems.push(
                `put \`- #${link[1]}\` on its own line after \`${link[0].trim()}\` (separated by a blank line); it makes GitHub show the issue title`,
            )
        }
    }
    for (const heading of ['## Summary', '## Test plan']) {
        if (!new RegExp(`^${heading}[ \\t]*$`, 'm').test(body)) {
            problems.push(`add a \`${heading}\` heading`)
        }
    }
    return problems
}

function main() {
    if (tty.isatty(0)) return
    let input
    try {
        input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
    } catch {
        return
    }
    const command = input?.tool_input?.command
    if (typeof command !== 'string' || !command.includes('gh')) return
    let body
    try {
        body = extractBody(command, input.cwd ?? process.cwd())
    } catch {
        return
    }
    if (body === null) return
    const problems = findBodyProblems(body)
    if (problems.length === 0) return
    process.stderr.write(
        `PR body doesn't follow .claude/skills/conventional-commits/SKILL.md's "PR description" structure:\n${problems
            .map((problem) => `- ${problem}`)
            .join('\n')}\nFix the body and run the command again.\n`,
    )
    process.exit(2)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
