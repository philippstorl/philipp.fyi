---
name: self-review
description: Get an independent, fresh-eyes review of the current diff from an isolated subagent that has no memory of how the code was written. Use as a standing step after implementing a non-trivial feature, fix, or refactor in philipp.fyi, before considering the change done — reviewing your own just-written code in the same context that wrote it tends to rubber-stamp it.
context: fork
agent: general-purpose
disallowed-tools: Edit Write NotebookEdit
---

# Fresh-eyes review

You're reviewing a diff in this repository. You have no memory of how or why this code was written, what was already tried, or what the author intended — that's the point. Review what's actually there, not the reasoning behind it.

## What to do

1. Get the diff: `git status` and `git diff` for the working tree, or `git diff <merge-base>...HEAD` if the work is on a branch ahead of `main`.
2. Invoke the `code-review` skill (Skill tool, skill name `code-review`) against this diff at `high` effort. Don't pass `--fix` or `--comment` — you have no write access in this context anyway, and posting PR comments isn't your job here. Your only job is to surface findings.
3. Return the findings as-is: correctness bugs first, then reuse/simplification/efficiency cleanups, each with a file:line reference and enough detail that whoever reads this (who hasn't seen `code-review`'s reasoning) can act on it without re-deriving it.
4. If `code-review` finds nothing, say so plainly — an empty findings list is a valid, useful result, not a failure to find something.

Don't attempt to fix anything yourself, even something trivial. That separation — you review, the caller fixes — is deliberate, not an oversight.
