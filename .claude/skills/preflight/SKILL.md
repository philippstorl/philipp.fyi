---
name: preflight
description: Run philipp.fyi's pre-commit/pre-PR verification sequence (format, lint, typecheck, trailing-slashes, favicons, color copies, learnings digest, build, dist checks, test, function tests, audit) in the right order, applying the conditional logic for which steps actually apply to what changed. Use before committing, before opening a PR, or whenever asked to verify, check, or make sure the repo is clean after a change.
---

# Preflight check

CLAUDE.md already specifies this sequence and that several of its steps are conditional on what changed. This skill exists so that conditional logic gets applied consistently instead of re-derived (or skipped) each time. These checks mirror the CI jobs in `.github/workflows/ci.yml` job-for-job — if they pass locally, CI should pass.

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
7. `npm run check:learnings` — run if `LEARNINGS.md`, `scripts/load-learnings.js`, `scripts/check-learnings.mjs` or `.claude/settings.json` changed. It runs the SessionStart hook's command and checks its JSON, the digest cap, the `## Open questions`/`## Log` headings and that open questions and log entries survive, since the hook itself swallows any failure. Plain Node, instant.
8. `npm run build` — run unless the change is content-only prose with zero risk of a type error (e.g. fixing a typo in an existing paragraph). `build` runs `astro check` before `astro build`, so it's also your typecheck-with-full-context step. When in doubt, run it.
9. `npm run check:font-preloads`, `npm run check:inline-module-scripts`, `npm run check:page-coverage` and `npm run check:csp` — run whenever step 8 ran; they check the fresh `dist/`. CI runs all four on every build, so skipping them locally can let a CI failure through.
10. `npm test` (Playwright) — run unless every changed file is docs, under `netlify/functions/`/`tests/functions/` (step 11 covers those), or CI YAML with no effect on the `test` job. Any change under `src/`, `e2e/` or `public/` counts, not just components/pages/content: specs import `src/data/`/`src/utils/` modules and `scripts/contrast-pages.mjs`, read `public/` files, and assert on `src/styles/global.css` rules. So do `astro.config.mjs`, `tsconfig.json`, `playwright.config.ts` and `package.json`/`package-lock.json`. `npm test` ignores `e2e/contrast.spec.ts`, so a change to it, `e2e/contrast.global-setup.ts` or `scripts/contrast-pages.mjs` also needs `npm run test:contrast && npm run check:contrast`.
11. `npm run test:functions` — run if any changed file is under `netlify/functions/` or `tests/functions/`, or is `playwright.functions.config.ts`. Plain Node, about a second, no dev server or port.
12. `npm run check:audit` — run if `package.json` or `package-lock.json` changed. It's CI's `audit` job (`npm audit --omit=dev --audit-level=high`), independent of the build, so its position in this list doesn't matter. Use the script, not bare `npm audit`, which drops that scoping.
13. `npm run test:hooks` — run if `scripts/check-pr-body.js` or its test changed. It unit-tests the PreToolUse hook that checks PR descriptions; a crash there exits 1, which doesn't block, so nothing else would notice. Plain Node, under a second.

## 4. Report

End with a short per-step pass/fail summary. If something fails, fix the root cause and re-run that step — don't bypass it (no `--no-verify`, no commenting out the assertion that's failing).
