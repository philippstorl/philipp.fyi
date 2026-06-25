---
name: conventional-commits
description: Determine the Conventional Commit type and scope for a change in philipp.fyi, link the originating GitHub issue when the branch was created from one, and apply this consistently to the git commit message and the PR title/description. Use whenever writing a commit message or opening a pull request — especially for changes that touch many files or directories, where it's tempting to drop the scope because no single directory seems to own the change.
---

# Conventional commits and PR titles

This repo follows `type(scope): description` for both commit messages and PR titles (they should match). Getting the type right is usually easy; the scope is where this has gone wrong before.

## Type

Required. Use whichever fits the change's nature — this repo isn't restricted to `feat`/`fix`. Seen in history: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `style`, `perf`.

## Scope

Optional, but default to including one. **The scope names the concern the change is about, not which directories or how many files it touched.** Ask "what is this change _about_?" — not "what directory does it live in?".

This matters because "it touches many files, so there's no single scope" is the wrong inference and has caused scope to get dropped on changes that absolutely had a clear concern. Precedent from this repo's own history settles it: `chore(format): add Prettier formatting and enforce it in CI` reformatted the _entire_ repository — every file — but still used scope `format`, because formatting is what the change was about. A repo-wide comment cleanup used scope `comments` for the same reason.

Examples of scopes already used here: `content`, `format`, `comments`, `deps`, `deps-dev`, `ci`.

Only omit the scope when there's genuinely no single good concern-word for the change — that should be rare, not the default for anything broad.

Don't second-guess this for Dependabot PRs — `.github/dependabot.yml` already formats those (`deps`/`deps-dev`) and they shouldn't be hand-edited.

## Linking the issue

This repo creates branches from GitHub issues (the "create a branch" button, or `gh issue develop`), which auto-prefixes the branch name with the issue number — e.g. branch `22-add-work-screenshots` comes from issue #22. Before opening the PR, check `git branch --show-current` for a leading number:

- If there's a numeric prefix, run `gh issue view <N>` to confirm the issue exists and that this PR actually addresses it (a branch can drift from its originating issue as work evolves). If it fully addresses it, add a `Resolves` section to the PR body, above `## Summary`:

    ```markdown
    Resolves

    - #<N>
    ```

    This is the format already used in this repo's history (PRs #18, #25) — GitHub auto-closes the linked issue when the PR merges. If the PR only partially addresses the issue, reference it without the auto-close keyword instead (e.g. `Relates to #<N>`), so merging doesn't close something still open.

- If there's no numeric prefix, there's no issue to link — don't search open issues for a plausible match and link it speculatively. A wrong guess auto-closes the wrong issue on merge, which is worse than linking nothing.

## PR description

Use this structure (matches existing merged PRs in this repo):

```markdown
Resolves

- #<N> <!-- omit this block entirely if there's no linked issue -->

## Summary

- What was wrong or missing, stated concretely
- What changed and why — lead with the reasoning, not a restatement of the diff
- Anything explicitly ruled out or out of scope, if relevant

## Test plan

- [ ] Specific check performed (command run, page verified, etc.) — not just "tested it"
```

Keep the title under ~70 characters. Before opening the PR, confirm the title's `type(scope)` matches what you used in the commit message(s) — they shouldn't drift apart.
