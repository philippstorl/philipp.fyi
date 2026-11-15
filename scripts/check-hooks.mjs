import { execFileSync, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

// The Stop hook runs check-doc-sync.js with `2>/dev/null || true`, so a crash
// silently turns the doc-sync nudge off. Runs the hook's own command without
// that suffix in a throwaway repo, so the developer's own changes don't matter.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUPPRESSION = /\s*2>\/dev\/null\s*\|\|\s*true\s*$/

const command = JSON.parse(
    fs.readFileSync(path.join(root, '.claude/settings.json'), 'utf8'),
)
    .hooks?.Stop?.flatMap((entry) => entry.hooks ?? [])
    .find((hook) => hook.command?.includes('check-doc-sync'))?.command

function fail(problems) {
    console.error('Stop hook check failed:')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
}

if (!command) {
    fail(['no Stop hook in .claude/settings.json runs check-doc-sync'])
}
if (!SUPPRESSION.test(command)) {
    fail([
        `\`${command}\` doesn't end in \`2>/dev/null || true\`; update this check for its new shape`,
    ])
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-hooks-'))
// Not a git repo: the hook falls back to its own script's repo there.
const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'check-hooks-cwd-'))
// An inherited GIT_DIR etc. (e.g. inside a git hook) would point git elsewhere.
const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
)
const problems = []
try {
    execFileSync('git', ['init', '-q'], { cwd: dir, env, stdio: 'ignore' })
    fs.mkdirSync(path.join(dir, 'scripts'))
    fs.mkdirSync(path.join(dir, 'src'))
    fs.copyFileSync(
        path.join(root, 'scripts/check-doc-sync.js'),
        path.join(dir, 'scripts/check-doc-sync.js'),
    )
    // Untracked, the copied script would itself count as a source change.
    fs.appendFileSync(
        path.join(dir, '.git/info/exclude'),
        '/scripts/check-doc-sync.js\n',
    )

    // Never cwd = repo root, so a cwd-relative script path fails (issue #476).
    const run = (label, cwd, input) => {
        const result = spawnSync(command.replace(SUPPRESSION, ''), {
            cwd,
            // Claude Code sets this for hooks; CI and a plain shell don't.
            env: { ...env, CLAUDE_PROJECT_DIR: dir },
            input: JSON.stringify({ hook_event_name: 'Stop', ...input }),
            encoding: 'utf8',
            shell: true,
            timeout: 10_000,
        })
        if (result.error || result.status !== 0) {
            problems.push(
                `${label}: \`${command}\` failed (${result.error?.message ?? `exit ${result.status}`}):\n${result.stderr ?? ''}`,
            )
            return null
        }
        return result.stdout
    }
    const expectSilence = (label, cwd, input) => {
        const stdout = run(label, cwd, input)
        if (stdout?.trim()) {
            problems.push(`${label}: expected no output, got ${stdout.trim()}`)
        }
    }
    const expectNudge = (label, cwd, input) => {
        const stdout = run(label, cwd, input)
        if (stdout === null) return
        let output
        try {
            output = JSON.parse(stdout)
        } catch (error) {
            output = error
        }
        const hook = output?.hookSpecificOutput
        if (output instanceof Error) {
            problems.push(`${label}: stdout isn't JSON: ${output.message}`)
        } else if (hook?.hookEventName !== 'Stop') {
            problems.push(
                `${label}: hookSpecificOutput.hookEventName is ${JSON.stringify(hook?.hookEventName)}, not "Stop"`,
            )
        } else if (
            typeof hook.additionalContext !== 'string' ||
            !hook.additionalContext.trim()
        ) {
            problems.push(
                `${label}: hookSpecificOutput.additionalContext is empty`,
            )
        }
    }

    const subdir = path.join(dir, 'src')
    expectSilence('clean tree', subdir, { stop_hook_active: false })
    fs.writeFileSync(path.join(dir, 'src/a.ts'), 'export {}\n')
    expectNudge('source change', subdir, { stop_hook_active: false })
    expectNudge('source change, cwd outside any repo', outside, {
        stop_hook_active: false,
    })
    expectSilence('stop_hook_active', subdir, { stop_hook_active: true })
    fs.writeFileSync(path.join(dir, 'README.md'), '# a\n')
    expectSilence('source and docs change', subdir, {
        stop_hook_active: false,
    })
} finally {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.rmSync(outside, { recursive: true, force: true })
}

if (problems.length > 0) fail(problems)
console.log(
    'Stop hook check passed (clean tree, source change from a subdirectory and outside the repo, stop_hook_active, docs updated).',
)
