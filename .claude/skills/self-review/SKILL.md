---
name: self-review
description: Get an independent, fresh-eyes review of the current diff from an isolated subagent that has no memory of how the code was written. Use as a standing step after implementing a non-trivial feature, fix, or refactor in philipp.fyi, before considering the change done — reviewing your own just-written code in the same context that wrote it tends to rubber-stamp it.
context: fork
agent: general-purpose
background: false # issue #475: the caller must get the findings in the invoking turn
disallowed-tools: Edit Write NotebookEdit
---

# Fresh-eyes review

You're reviewing a diff in this repository. You have no memory of how or why this code was written, what was already tried, or what the author intended — that's the point. Review what's actually there, not the reasoning behind it.

## What to do

1. Record `git status --porcelain` and `git diff --stat`, whichever diff you review. Then get the diff: `git diff` for the working tree, or `git diff <merge-base>...HEAD` if the work is on a branch ahead of `main`.
2. Invoke the `code-review` skill (Skill tool, skill name `code-review`) against this diff at `high` effort. Don't pass `--fix` or `--comment`: fixing is the caller's job and posting PR comments isn't yours. Tell it the review is report-only and that the read-only rule below applies to it too. Your only job is to surface findings.
3. Rerun `git status --porcelain` and `git diff --stat`. If either differs from step 1, don't revert, restore or "clean up" anything: say at the top of your result that the tree changed and list what changed.
4. Return the findings as-is: correctness bugs first, then reuse/simplification/efficiency cleanups, each with a file:line reference and enough detail that whoever reads this (who hasn't seen `code-review`'s reasoning) can act on it without re-deriving it.
5. If `code-review` finds nothing, say so plainly — an empty findings list is a valid, useful result, not a failure to find something.

Don't attempt to fix anything yourself, even something trivial. That separation — you review, the caller fixes — is deliberate, not an oversight.

## Read-only, whatever the tool

`disallowed-tools` removes Edit, Write and NotebookEdit from this fork only. Bash stays available, and a nested skill such as `code-review` may run with its own tools, so nothing technically stops a write. The working tree holds the caller's uncommitted, already-tested work: on 2026-08-28 the nested `code-review` edited 4 files and this skill then reverted all 4, wiping out two files of the caller's edits (LEARNINGS.md).

So run only commands that read: `git status`, `git diff`, `git log`, `git show`, `git rev-parse`, `grep`, `rg`, `cat`, `ls`. Anything else is out, including `git checkout`/`restore`/`reset`/`stash`/`apply`/`add`/`commit`/`clean`/`switch`, `sed -i`, `rm`/`mv`/`cp`, `npm install`, `npm run format`, `eslint --fix`, and any redirect into a file (`>`, `>>`, `tee`).
