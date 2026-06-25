---
name: preflight
description: Run philipp.fyi's pre-commit/pre-PR verification sequence (format, lint, typecheck, trailing-slashes, build, test) in the right order, applying the conditional logic for which steps actually apply to what changed. Use before committing, before opening a PR, or whenever asked to verify, check, or make sure the repo is clean after a change.
---

# Preflight check

CLAUDE.md already specifies this sequence and that two of its steps are conditional on what changed. This skill exists so that conditional logic gets applied consistently instead of re-derived (or skipped) each time. These checks mirror the CI jobs in `.github/workflows/ci.yml` job-for-job — if they pass locally, CI should pass.

## 1. Figure out what changed

Use `git status` / `git diff --name-only` (against the merge-base with `main` if on a branch) to get the changed file list. You need this to decide steps 5 and 6 below.

## 2. Always run, in this order

1. `npm run format:check` — fast, catches the most trivial failures first. Use `npm run format` to auto-fix instead of just reporting.
2. `npm run lint`
3. `npm run typecheck`

Fix failures before moving on — there's no value running later, slower steps against code that's already known to fail a fast check.

## 3. Conditional steps

4. `npm run check:trailing-slashes` — run if any changed file is a route, link, or test that could contain one: anything under `src/pages/`, `e2e/`, any `.astro`/`.md`/`.mdx` file, or `astro.config.mjs`. It's cheap; if you're unsure whether a change touches a link, run it anyway.
5. `npm run build` — run unless the change is content-only prose with zero risk of a type error (e.g. fixing a typo in an existing paragraph). `build` runs `astro check` before `astro build`, so it's also your typecheck-with-full-context step. When in doubt, run it.
6. `npm test` (Playwright) — run if any changed file is under `src/components/`, `src/pages/`, `src/content/`, `src/layouts/`, or `e2e/` itself. Skip it for changes confined to docs, config comments, or CI YAML with no behavioral effect.

## 4. Report

End with a short per-step pass/fail summary. If something fails, fix the root cause and re-run that step — don't bypass it (no `--no-verify`, no commenting out the assertion that's failing).
