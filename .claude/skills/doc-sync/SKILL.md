---
name: doc-sync
description: Check whether README.md and/or CLAUDE.md need updating after a code change — new npm scripts, new CI jobs, content schema changes, new routes/components, new test coverage, or a non-obvious gotcha discovered while implementing. Use after implementing any feature, config change, dependency-driven behavior change, or non-trivial refactor in philipp.fyi, before considering the change done. Nothing in CI catches documentation drift, so this is the only check standing between a real change and a README/CLAUDE.md that quietly stops matching reality.
---

# Doc sync

README.md and CLAUDE.md are useful only as long as they describe what's actually in the repo. Unlike lint/typecheck/build, nothing fails if they drift — so this check has to be deliberate, every time, not assumed to happen as a side effect of writing the code.

## Procedure

1. Get the diff: `git diff` / `git status` for the working tree, or `git diff <merge-base>...HEAD` if working on a branch.
2. Walk the change against this list. For anything that matches, go to the named doc section and make the specific edit — don't just flag it, write the before/after.

| Change                                                                                                             | Update                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New/removed/renamed `npm run` script in `package.json`                                                             | README's Scripts table; also the CI table if it's wired into a `.github/workflows/ci.yml` job                                                                                                                                 |
| New or changed CI job                                                                                              | README's CI jobs table — job name and "what it does" column                                                                                                                                                                   |
| New/changed field in a `src/content.config.ts` schema                                                              | README's "Content editing" frontmatter example for that collection, and CLAUDE.md's "Content collections" bullet                                                                                                              |
| New top-level directory/category under `src/components/`, `src/pages/`, or `src/utils/`                            | README's "Key paths" tree                                                                                                                                                                                                     |
| New `e2e/*.spec.ts` file, or an existing one now covers something materially new                                   | README's "Test coverage" table                                                                                                                                                                                                |
| New file under `.claude/skills/`                                                                                   | CLAUDE.md's "Claude Code skills" list                                                                                                                                                                                         |
| New setup step (a CLI to install, a one-time command like `npx playwright install`, a new required env var/secret) | README's "Setup"/"Prerequisites" section                                                                                                                                                                                      |
| New third-party script, embed, or analytics provider                                                               | CLAUDE.md's CSP bullet, and the `Content-Security-Policy` TODO in `netlify.toml` it points at                                                                                                                                 |
| A non-obvious constraint, workaround, or "don't do X" you only learned by hitting it while implementing            | CLAUDE.md's "Stack facts," "Conventions to respect," or "Don't" section — whichever fits; this is the case most worth catching, because it's the knowledge that's expensive to rediscover and easiest to forget to write down |

3. If nothing in the diff matches anything above — e.g. a pure prose fix, a dependency patch bump, a one-line bug fix with no new behavior — say so explicitly ("no README/CLAUDE.md updates needed because \_\_\_") rather than silently skipping the check. The goal is for this check to visibly happen every time, not to force an edit every time.

This is a separate concern from `preflight` (code correctness) — run both, not one instead of the other.
