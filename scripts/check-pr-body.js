import fs from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'
import tty from 'tty'
import { fileURLToPath } from 'url'

// PreToolUse hook: blocks `gh pr create`/`gh pr edit` when the body breaks the
// conventional-commits skill's "PR description" structure. Exit 2 blocks the call
// and shows stderr to Claude; anything it can't read or parse is let through.

const GH_PR_WRITE = /\bgh\s+pr\s+(?:create|edit)\b/g
// A body flag and its separator; the value is read as a shell word after it.
const BODY_FLAG = /(?<=\s)(--body-file|-F|--body|-b)(?:=|(?:[ \t]|\\\n)+)/g
const HEREDOC_START =
    /^<<(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([^\s;&|<>()'"`]+))/
// `--body "$(cat <<'EOF' ... EOF\n)"` and `--body "$(cat path)"` are read; any other
// `$` or backtick in a body or path can't be resolved here.
const CAT_HEREDOC = /^"\$\(cat[ \t]*(?=<<)/
const CAT_SUBSTITUTION =
    /^"?\$\(cat\s+(?:"([^"]+)"|'([^']+)'|([^\s<)]\S*?))\s*\)/

const expandHome = (path) => path.replace(/^~(?=\/|$)/, homedir())

// Scans `command` like a shell. `frame[i]` is -1 for text that isn't code (quotes,
// comments, heredoc bodies, backticks, arithmetic), 0 at the top level and a
// distinct id inside each `$(...)`. `ends` lists command separators per frame.
function scanShell(command) {
    const frame = new Int32Array(command.length).fill(-1)
    const ends = []
    const closes = []
    const heredocs = []
    const stack = []
    let pending = []
    let frames = 1
    let i = 0
    while (i < command.length) {
        const char = command[i]
        const context = stack.at(-1)
        const type = context?.type
        if (type === "'") {
            if (char === "'") stack.pop()
            i++
            continue
        }
        if (type === '`') {
            if (char === '`') stack.pop()
            i += char === '\\' ? 2 : 1
            continue
        }
        if (type === '$((' || type === 'arith(') {
            if (type === '$((' && command.startsWith('))', i)) {
                stack.pop()
                i += 2
                continue
            }
            if (char === '(') stack.push({ type: 'arith(' })
            else if (char === ')') stack.pop()
            i++
            continue
        }
        if (char === '\\') {
            i += 2
            continue
        }
        if (command.startsWith('$((', i)) {
            stack.push({ type: '$((' })
            i += 3
            continue
        }
        if (command.startsWith('$(', i)) {
            stack.push({ type: '$(', id: frames++ })
            i += 2
            continue
        }
        if (type === '"') {
            if (char === '"') stack.pop()
            else if (char === '`') stack.push({ type: '`' })
            i++
            continue
        }
        const id = context?.id ?? 0
        frame[i] = id
        if (char === "'" || char === '"' || char === '`') {
            stack.push({ type: char })
        } else if (char === '(' && context) {
            stack.push({ type: '(', id })
        } else if (char === ')' && context) {
            if (stack.pop().type === '$(') closes[id] = i
        } else if (char === '#' && /^$|[\s;&|()]/.test(command[i - 1] ?? '')) {
            frame[i] = -1
            const newline = command.indexOf('\n', i)
            i = newline === -1 ? command.length : newline
            continue
        } else if (
            command.startsWith('<<', i) &&
            !command.startsWith('<<<', i)
        ) {
            const start = command.slice(i).match(HEREDOC_START)
            if (start) {
                pending.push({
                    at: i,
                    strip: start[1] === '-',
                    quoted: start[4] === undefined || start[0].includes('\\'),
                    delimiter: start[2] ?? start[3] ?? start[4],
                    lineEnd: i + start[0].length,
                })
                i += start[0].length
                continue
            }
        } else if (char === '\n') {
            ends.push({ index: i, length: 1, frame: id })
            i++
            // Heredoc bodies start on the next line and aren't code.
            for (const heredoc of pending) {
                const lines = []
                const bodyStart = i
                let closed = false
                while (i < command.length && !closed) {
                    const newline = command.indexOf('\n', i)
                    const lineEnd = newline === -1 ? command.length : newline
                    let line = command.slice(i, lineEnd)
                    if (heredoc.strip) line = line.replace(/^\t+/, '')
                    i = lineEnd + 1
                    if (line === heredoc.delimiter) closed = true
                    else lines.push(line)
                }
                i = Math.min(i, command.length)
                if (closed) {
                    heredocs.push({
                        ...heredoc,
                        bodyStart,
                        end: i,
                        body: lines.join('\n'),
                    })
                }
            }
            pending = []
            continue
        } else if (command.startsWith('&&', i) || command.startsWith('||', i)) {
            ends.push({ index: i, length: 2, frame: id })
            i += 2
            continue
        } else if (
            char === ';' ||
            char === '|' ||
            (char === ')' && !context) ||
            (char === '&' &&
                !'<>'.includes(command[i - 1] ?? '') &&
                command[i + 1] !== '>')
        ) {
            ends.push({ index: i, length: 1, frame: id })
        }
        i++
    }
    return { frame, ends, closes, heredocs }
}

// Decodes the shell word at `start` into { text, end }, or returns null if it has
// an expansion or an unterminated quote.
function readWord(command, start) {
    let text = ''
    let quote = null
    let i = start
    for (; i < command.length; i++) {
        const char = command[i]
        if (quote === "'") {
            if (char === "'") quote = null
            else text += char
        } else if (quote === '"') {
            if (char === '"') quote = null
            else if (char === '$' || char === '`') return null
            else if (char === '\\' && '$`"\\\n'.includes(command[i + 1])) {
                i++
                if (command[i] !== '\n') text += command[i]
            } else text += char
        } else if (/[\s;&|<>()]/.test(char)) {
            break
        } else if (char === '$' || char === '`') {
            return null
        } else if (char === "'" || char === '"') {
            quote = char
        } else if (char === '\\') {
            i++
            if (i < command.length && command[i] !== '\n') text += command[i]
        } else {
            text += char
        }
    }
    return quote ? null : { text, end: i }
}

// Applies each `cd <dir> &&`/`;`/newline that runs before `index` in its frame or
// the top level.
function resolveCwd(command, scan, index, cwd) {
    const starts = [0, ...scan.ends.map((end) => end.index + end.length)]
    for (const start of starts) {
        if (start >= index) break
        const cd = command.slice(start, index).match(/^(\s*)cd[ \t]+/)
        const at = start + (cd?.[1].length ?? 0)
        if (!cd || ![0, scan.frame[index]].includes(scan.frame[at])) continue
        const word = readWord(command, start + cd[0].length)
        if (!word || word.text === '-') continue
        if (!/^[ \t]*(?:&&|;|\n)/.test(command.slice(word.end))) continue
        cwd = resolve(cwd, expandHome(word.text))
    }
    return cwd
}

// Returns the body one `gh pr create|edit` would send, or null when it sends none
// (e.g. `gh pr edit --add-label`) or the hook can't tell what it would be.
function extractBody(command, scan, index, cwd) {
    const id = scan.frame[index]
    const end = Math.min(
        scan.ends.find((e) => e.frame === id && e.index > index)?.index ??
            command.length,
        scan.closes[id] ?? command.length,
    )
    const flags = [...command.slice(index, end).matchAll(BODY_FLAG)].filter(
        (m) => scan.frame[index + m.index] === id,
    )
    const isFile = (m) => m[1] === '--body-file' || m[1] === '-F'
    // gh sends the last value given.
    const flag = flags.findLast(isFile) ?? flags.at(-1)
    if (!flag) return null
    const start = index + flag.index + flag[0].length
    const value = command.slice(start, end)
    const read = (path) =>
        fs.readFileSync(
            resolve(resolveCwd(command, scan, index, cwd), expandHome(path)),
            'utf8',
        )
    if (isFile(flag)) {
        const path = readWord(value, 0)?.text
        return path === undefined || path === '-' ? null : read(path)
    }
    const catHeredoc = value.match(CAT_HEREDOC)
    if (catHeredoc) {
        const heredoc = scan.heredocs.find(
            (h) => h.at === start + catHeredoc[0].length,
        )
        if (
            !heredoc ||
            !/^[ \t]*\n$/.test(
                command.slice(heredoc.lineEnd, heredoc.bodyStart),
            ) ||
            !/^\s*\)"/.test(command.slice(heredoc.end)) ||
            (!heredoc.quoted && /[$`\\]/.test(heredoc.body))
        ) {
            return null
        }
        return heredoc.body
    }
    const cat = value.match(CAT_SUBSTITUTION)
    if (cat) return read(cat[1] ?? cat[2] ?? cat[3])
    return readWord(value, 0)?.text ?? null
}

// Returns the body of every `gh pr create|edit` in `command` that the hook can read.
export function extractBodies(command, cwd) {
    const scan = scanShell(command)
    const bodies = []
    for (const match of command.matchAll(GH_PR_WRITE)) {
        if (scan.frame[match.index] === -1) continue
        try {
            const body = extractBody(command, scan, match.index, cwd)
            if (body !== null) bodies.push(body)
        } catch {
            // Unreadable body file: let it through.
        }
    }
    return bodies
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
    let problems
    try {
        problems = [
            ...new Set(
                extractBodies(command, input.cwd ?? process.cwd()).flatMap(
                    findBodyProblems,
                ),
            ),
        ]
    } catch {
        return
    }
    if (problems.length === 0) return
    process.stderr.write(
        `PR body doesn't follow .claude/skills/conventional-commits/SKILL.md's "PR description" structure:\n${problems
            .map((problem) => `- ${problem}`)
            .join('\n')}\nFix the body and run the command again.\n`,
    )
    process.exit(2)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
