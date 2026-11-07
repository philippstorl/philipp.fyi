import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { findBodyProblems } from './check-pr-body.js'

const script = fileURLToPath(new URL('./check-pr-body.js', import.meta.url))
const good =
    'Resolves #12\n\n- #12\n\n## Summary\n\n- x\n\n## Test plan\n\n- [x] y\n'
const missingBullet = good.replace('- #12\n\n', '')

// Runs the hook the way Claude Code does: PreToolUse JSON on stdin.
function runHook(command, cwd = os.tmpdir()) {
    return spawnSync(process.execPath, [script], {
        input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command },
            cwd,
        }),
        encoding: 'utf8',
    })
}

test('accepts the skill structure, with or without an issue link', () => {
    assert.deepEqual(findBodyProblems(good), [])
    assert.deepEqual(
        findBodyProblems(good.replace('Resolves', 'Relates to')),
        [],
    )
    assert.deepEqual(
        findBodyProblems('## Summary\n\n- x\n\n## Test plan\n\n- [x] y\n'),
        [],
    )
})

test('flags a missing issue-title bullet, a wrong number and missing headings', () => {
    assert.equal(findBodyProblems(missingBullet).length, 1)
    assert.equal(findBodyProblems(good.replace('- #12', '- #13')).length, 1)
    assert.equal(findBodyProblems('Resolves #12\n\n- #12\n').length, 2)
    assert.equal(
        findBodyProblems(missingBullet.replace('Resolves', 'Fixes')).length,
        1,
    )
})

test('blocks gh pr create/edit with a bad --body-file, relative to the cwd', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-body-'))
    fs.writeFileSync(path.join(dir, 'bad.md'), missingBullet)
    fs.writeFileSync(path.join(dir, 'good.md'), good)
    const bad = runHook('gh pr create --title t --body-file bad.md', dir)
    assert.equal(bad.status, 2)
    assert.match(bad.stderr, /- #12/)
    assert.equal(runHook('gh pr edit 5 -F "good.md"', dir).status, 0)
    assert.equal(
        runHook(`gh pr edit 5 --body "$(cat ${dir}/bad.md)"`).status,
        2,
    )
})

test('resolves a relative --body-file after a leading cd', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-body-'))
    fs.mkdirSync(path.join(dir, 'sub'))
    fs.writeFileSync(path.join(dir, 'sub', 'bad.md'), missingBullet)
    assert.equal(
        runHook('cd sub && gh pr create --body-file bad.md', dir).status,
        2,
    )
})

test('checks a multi-line inline body', () => {
    const quoted = (body) => `gh pr create --title t --body "${body}"`
    assert.equal(runHook(quoted(missingBullet)).status, 2)
    assert.equal(runHook(quoted(good)).status, 0)
})

test('checks an inline heredoc body', () => {
    const heredoc = (body) =>
        `gh pr create --title t --body "$(cat <<'EOF'\n${body}EOF\n)"`
    assert.equal(runHook(heredoc(missingBullet)).status, 2)
    assert.equal(runHook(heredoc(good)).status, 0)
})

test('lets through commands it does not check or cannot read', () => {
    for (const command of [
        'gh pr view 5 --json body',
        'gh pr edit 5 --add-label bug',
        'gh pr create --title t --body-file -',
        'gh pr create --title t --body-file /nonexistent/body.md',
        'git status',
        'git checkout -b feat && gh pr create --fill',
        'git commit -F msg.txt && gh pr create --fill',
        'git commit -m "docs: gh pr edit --body x"',
        `git commit -m "$(cat <<'EOF'\nfix: x\n\ngh pr create --body y\nEOF\n)"`,
        'gh pr create --title t --body "$BODY"',
        'gh pr create --title t --body "$(<body.md)"',
    ]) {
        assert.equal(runHook(command).status, 0, command)
    }
    const garbage = spawnSync(process.execPath, [script], {
        input: 'not json',
        encoding: 'utf8',
    })
    assert.equal(garbage.status, 0)
})
