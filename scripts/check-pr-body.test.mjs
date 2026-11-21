import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { findBodyProblems } from './check-pr-body.js'

const script = path.join(import.meta.dirname, 'check-pr-body.js')
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

test('ignores body flags quoted in the title or written in a heredoc body (#661)', () => {
    const heredoc = (body) => `"$(cat <<'EOF'\n${body}EOF\n)"`
    const mentionsFlag = missingBullet.replace(
        '- x',
        '- set it with `gh api -F enforcement=active`',
    )
    const bad = runHook(
        `gh pr create --title t --body ${heredoc(mentionsFlag)}`,
    )
    assert.equal(bad.status, 2)
    assert.match(bad.stderr, /- #12/)
    const quotedFlag = runHook(
        `gh pr create --title "ci: pass -F 'x' to gh api" --body ${heredoc(
            missingBullet.replace(/## Test plan[\s\S]*/, ''),
        )}`,
    )
    assert.equal(quotedFlag.status, 2)
    assert.match(quotedFlag.stderr, /- #12/)
    assert.match(quotedFlag.stderr, /## Test plan/)
})

test('does not block commands whose flags only look like a body (#661)', () => {
    for (const command of [
        `gh pr edit 12 --title "docs: explain the -b 'x' shorthand"`,
        `gh pr edit 12 --add-label x && git commit -m "fix" -b 'nope'`,
        `gh pr edit 12 --add-label x; echo -F nope.md`,
        `gh pr edit 12 --add-label x | tee -b 'nope'`,
        `cat > notes.md <<'EOF'\ngh pr edit 5 -b 'x'\nEOF`,
        `cat > notes.md <<'EOF'\ngh pr edit 5 -b 'x'\nEOF\ngit status`,
        `gh pr edit 12 --add-label x # --body 'x'`,
    ]) {
        assert.equal(runHook(command).status, 0, command)
    }
})

test('reads a quoted inline body up to its closing quote (#661)', () => {
    const endsWithHeading = good.replace(/\n\n- \[x\] y\n$/, '')
    const endsWithBullet =
        '## Summary\n\n- x\n\n## Test plan\n\n- y\n\nRelates to #12\n\n- #12'
    for (const body of [endsWithHeading, endsWithBullet]) {
        assert.equal(runHook(`gh pr create --body "${body}"`).status, 0)
        assert.equal(runHook(`gh pr create --body '${body}'`).status, 0)
        assert.equal(runHook(`gh pr create --body="${body}" --draft`).status, 0)
    }
    const escaped = good.replace('- x', '- a \\"b\\" c')
    assert.equal(runHook(`gh pr create --body "${escaped}"`).status, 0)
    assert.equal(
        runHook(`gh pr create --body '${missingBullet}' --draft`).status,
        2,
    )
    const parens = good.replace('- x', '- handles "quotes" and (parens)')
    assert.equal(
        runHook(`gh pr create --body "$(cat <<'EOF'\n${parens}EOF\n)" --draft`)
            .status,
        0,
    )
})

test('checks every gh pr command it can find (#661)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-body-'))
    fs.writeFileSync(path.join(dir, 'bad.md'), missingBullet)
    for (const command of [
        'gh pr edit 5 --add-label x && gh pr edit 5 --body-file bad.md',
        `gh pr create --fill;gh pr edit 6 -b '${missingBullet}'`,
        'url=$(gh pr create --title t --body-file bad.md) && gh pr merge "$url"',
        'echo $((1<<2))\ngh pr create --body-file bad.md',
        `gh pr create --body '${good}' --body '${missingBullet}'`,
    ]) {
        assert.equal(runHook(command, dir).status, 2, command)
    }
    for (const command of [
        `gh pr create --body '${missingBullet}' --body '${good}'`,
        'gh pr create --fill & git commit -F bad.md',
    ]) {
        assert.equal(runHook(command, dir).status, 0, command)
    }
})

test('ends a heredoc only at its exact delimiter (#661)', () => {
    assert.equal(
        runHook(`cat > notes.md <<'EOF'\n  EOF\ngh pr edit 5 -b 'x'\nEOF`)
            .status,
        0,
    )
    const tabbed = good.replace(/^/gm, '\t')
    assert.equal(
        runHook(`gh pr create --body "$(cat <<-'EOF'\n${tabbed}\tEOF\n)"`)
            .status,
        0,
    )
    assert.equal(
        runHook(`gh pr create --body "$(cat <<EOF\n${good}$X\nEOF\n)"`).status,
        0,
    )
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
