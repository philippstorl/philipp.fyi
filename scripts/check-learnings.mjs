import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// The SessionStart hook runs load-learnings.js with `2>/dev/null || true`, so
// a crash or a malformed digest silently drops LEARNINGS.md from every
// session. Runs the hook's own command without that suffix and checks what
// it would inject.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

// Claude Code only previews an additionalContext over this many characters.
const HOOK_LIMIT = 10_000
const SUPPRESSION = /\s*2>\/dev\/null\s*\|\|\s*true\s*$/

// Lines under `## <heading>` up to the next `## `, like the loader's parse().
function section(text, heading) {
    const lines = text.split(/\r?\n/)
    const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
    if (start === -1) return ''
    const end = lines.findIndex((line, i) => i > start && /^## /.test(line))
    return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

const problems = []
let length = 0

const cap = Number(
    /\bMAX_CHARS\s*=\s*([\d_]+)\b/
        .exec(read('scripts/load-learnings.js'))?.[1]
        ?.replaceAll('_', ''),
)
if (!Number.isInteger(cap) || cap <= 0 || cap >= HOOK_LIMIT) {
    problems.push(
        `load-learnings.js's MAX_CHARS must be a plain number under ${HOOK_LIMIT} (found ${cap})`,
    )
}

const command = JSON.parse(read('.claude/settings.json'))
    .hooks?.SessionStart?.flatMap((entry) => entry.hooks ?? [])
    .find((hook) => hook.command?.includes('load-learnings'))?.command
const learnings = fs.existsSync(path.join(root, 'LEARNINGS.md'))
    ? read('LEARNINGS.md')
    : null
const hasOpenQuestions =
    learnings !== null && /^- /m.test(section(learnings, 'Open questions'))

if (learnings === null) {
    problems.push('LEARNINGS.md is missing')
} else if (!command) {
    problems.push(
        'no SessionStart hook in .claude/settings.json runs load-learnings',
    )
} else {
    const run = spawnSync(command.replace(SUPPRESSION, ''), {
        cwd: root,
        encoding: 'utf8',
        shell: true,
        timeout: 10_000,
    })
    let output
    try {
        output = JSON.parse(run.stdout)
    } catch (error) {
        output = error
    }
    const hook = output?.hookSpecificOutput
    const context = hook?.additionalContext
    if (run.error || run.status !== 0) {
        problems.push(
            `\`${command}\` failed (${run.error?.message ?? `exit ${run.status}`}):\n${run.stderr ?? ''}`,
        )
    } else if (output instanceof Error) {
        problems.push(`stdout isn't JSON: ${output.message}`)
    } else if (hook?.hookEventName !== 'SessionStart') {
        problems.push(
            `hookSpecificOutput.hookEventName is ${JSON.stringify(hook?.hookEventName)}, not "SessionStart"`,
        )
    } else if (typeof context !== 'string' || !context.trim()) {
        problems.push('hookSpecificOutput.additionalContext is empty')
    } else {
        length = context.length
        if (length > cap) {
            problems.push(
                `additionalContext is ${length} characters, over the ${cap} cap`,
            )
        }
        // The loader keeps the heading even when no question fits the budget.
        const questions = section(context, 'Open questions')
        if (
            hasOpenQuestions &&
            !/^- (?!\(\d+ more open questions)/m.test(questions)
        ) {
            problems.push(
                "additionalContext has none of LEARNINGS.md's open questions",
            )
        }
    }
}

if (problems.length > 0) {
    console.error('LEARNINGS.md digest check failed:')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

console.log(
    `LEARNINGS.md digest check passed (${length} of ${cap} characters).`,
)
