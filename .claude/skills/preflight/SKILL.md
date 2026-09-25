---
name: preflight
description: Run philipp.fyi's pre-commit/pre-PR verification sequence (format, lint, typecheck, trailing-slashes, build, dist checks, test) in the right order, applying the conditional logic for which steps actually apply to what changed. Use before committing, before opening a PR, or whenever asked to verify, check, or make sure the repo is clean after a change.
---

# Preflight check

CLAUDE.md already specifies this sequence and that two of its steps are conditional on what changed. This skill exists so that conditional logic gets applied consistently instead of re-derived (or skipped) each time. These checks mirror the CI jobs in `.github/workflows/ci.yml` job-for-job — if they pass locally, CI should pass.

## 1. Figure out what changed

Use `git status` / `git diff --name-only` (against the merge-base with `main` if on a branch) to get the changed file list. You need this to decide the conditional steps below.

## 2. Always run, in this order

1. `npm run format:check` — fast, catches the most trivial failures first. Use `npm run format` to auto-fix instead of just reporting.
2. `npm run lint`
3. `npm run typecheck`

Fix failures before moving on — there's no value running later, slower steps against code that's already known to fail a fast check.

## 3. Conditional steps

4. `npm run check:trailing-slashes` — run if any changed file is a route, link, or test that could contain one: anything under `src/pages/`, `e2e/`, any `.astro`/`.md`/`.mdx` file, or `astro.config.mjs`. It's cheap; if you're unsure whether a change touches a link, run it anyway.
5. `npm run check:favicons` — run if any changed file is under `public/` or is `scripts/favicons.sha256`. It only hashes the SVG and rasters, so a generator-only edit needs its own `npm run generate:favicons` run. On a failure, run `npm run generate:favicons` (macOS only) and commit its output; don't hand-edit the stamp.
6. `npm run check:color-copies` — run if `src/styles/global.css`, `src/utils/og-image.ts`, `public/favicon.svg`, `src/layouts/BaseLayout.astro` or `scripts/check-color-copies.mjs` itself changed: those hold the color tokens and their hex copies. It's instant; run it when unsure.
7. `npm run build` — run unless the change is content-only prose with zero risk of a type error (e.g. fixing a typo in an existing paragraph). `build` runs `astro check` before `astro build`, so it's also your typecheck-with-full-context step. When in doubt, run it.
8. `npm run check:font-preloads`, `npm run check:inline-module-scripts` and `npm run check:page-coverage` — run whenever step 7 ran; they check the fresh `dist/`. CI runs all three on every build, so skipping them locally can let a CI failure through.
9. `npm test` (Playwright) — run if any changed file is under `src/components/`, `src/pages/`, `src/content/`, `src/layouts/`, or `e2e/` itself. Skip it for changes confined to docs, config comments, or CI YAML with no behavioral effect.
10. `npm run test:functions` — run if any changed file is under `netlify/functions/` or `tests/functions/`, or is `playwright.functions.config.ts`. Plain Node, about a second, no dev server or port.

## 4. Report

End with a short per-step pass/fail summary. If something fails, fix the root cause and re-run that step — don't bypass it (no `--no-verify`, no commenting out the assertion that's failing).
