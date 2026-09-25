---
name: project-audit
description: Run a full or targeted repository audit of philipp.fyi (security, accessibility, performance, code quality, UX/SEO, and more) using independent parallel agents, an independent verification pass, and one filed GitHub issue per confirmed finding. Use when asked to audit, review, or find issues across the whole codebase — not for reviewing a single diff (use self-review/code-review for that).
---

# Project audit

A full-repository audit, distinct from `self-review`/`code-review`: those review a diff against
what was just written, this reviews the whole live site/codebase against the categories below,
independent of any recent change. Runs as multiple parallel agents in the current session (not
forked) because it needs to spawn sub-agents itself and create real GitHub issues at the end —
actions the user should see happen, not something buried inside an isolated fork.

Developed and refined across three audit passes (2026-08-21, issues #174-191) and a full pass on
2026-09-24 (#388-#423). The single most important lesson from that history: **run every chosen
category in one parallel wave, not sequential rounds.** Rounds only happened that first time because the categories were decided
one at a time in conversation — nothing about the categories themselves requires sequencing.
Pick every category worth running this time and launch them together. A two-round pass on
2026-09-25 (#470-#533, then #534-#551) added the round-2 lenses in §1's table, which are the one
deliberate exception (see below the table).

## 1. Pick categories

Ask the user, or infer from their request, which categories to run. Default to **all validated
categories** for "do a full audit"; run a subset for a targeted request ("check performance
again", "audit accessibility"). A new category starts out marked _Proposed_ until it has run
as a full pass; mention any such category as an available option rather than silently including
or excluding it.

| Category                                     | What it checks                                                                                                                                                                             | Method                                                                                                                                                                                                                                                                                                                                                                                                          | Status                                                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**                                 | CSP/headers, Netlify Functions (injection, auth, signature verification), secrets, `npm audit`, dependency vulns, GitHub repo security settings                                            | Static reading + real `gh api`/`npm audit` runs                                                                                                                                                                                                                                                                                                                                                                 | Validated                                                                                                                                                                                                        |
| **Accessibility & semantic HTML**            | Heading hierarchy, landmarks, ARIA correctness, alt text, list/button/link semantics, focus order                                                                                          | Static reading, spot-check contrast math                                                                                                                                                                                                                                                                                                                                                                        | Validated                                                                                                                                                                                                        |
| **Code quality, bugs, refactoring**          | Logic bugs, dead code, duplication, TS quality, error-handling gaps, lint/typecheck/build health                                                                                           | Static reading + running `typecheck`/`lint`/`build`                                                                                                                                                                                                                                                                                                                                                             | Validated                                                                                                                                                                                                        |
| **UX/UI, content, SEO**                      | Copy clarity, broken/dead links, meta tags, structured data, responsive breakpoints, error/empty states                                                                                    | Static reading + built-output inspection                                                                                                                                                                                                                                                                                                                                                                        | Validated                                                                                                                                                                                                        |
| **Real performance measurement**             | Actual Lighthouse scores, Core Web Vitals, unused JS/CSS, cache headers, request waterfall                                                                                                 | Real Lighthouse run against a live build (see §4 gotchas: no local server reproduces production `Cache-Control`, so production is often the only authentic target)                                                                                                                                                                                                                                              | Validated                                                                                                                                                                                                        |
| **Cross-browser / responsive visual QA**     | Real rendering differences (color functions, CSS features, animations) across engines, not just Chromium                                                                                   | Playwright screenshots in Chromium + Firefox + WebKit, visually reviewed                                                                                                                                                                                                                                                                                                                                        | Validated                                                                                                                                                                                                        |
| **Dependency license audit**                 | Copyleft/unknown licenses in shipped code vs. build-only tooling, attribution gaps                                                                                                         | Real `license-checker` run + grep of built JS for stripped license banners                                                                                                                                                                                                                                                                                                                                      | Validated                                                                                                                                                                                                        |
| **Accessibility tree (screen-reader proxy)** | What a real screen reader actually receives — reading order, redundant/missing announcements, live-region behavior, state exposure — not axe DOM rules                                     | Playwright + a raw CDP session (`Accessibility.getFullAXTree`) against Chromium; see §4 gotchas for the sharp edges                                                                                                                                                                                                                                                                                             | Validated                                                                                                                                                                                                        |
| **Legal & compliance**                       | Impressum/DDG requirements, GDPR/cookie consent posture, privacy policy for contact-form data (Netlify Forms retention), whether an accessibility statement is expected                    | Research + static reading                                                                                                                                                                                                                                                                                                                                                                                       | Validated (#302; full pass 2026-09-24: #401-#404). The impressum question is still open in #61; check it before re-researching from scratch.                                                                     |
| **CI/CD & supply-chain hardening**           | GitHub Actions pinned by tag vs. commit SHA, branch protection / required status checks on `main`, `npm ci` vs `npm install` in CI, secrets exposure in Action logs, install scripts       | Static reading of `.github/workflows/*.yml` + `gh api` for branch protection settings                                                                                                                                                                                                                                                                                                                           | Validated (#303, #304; full pass 2026-09-24: #417, #418, co-found #409, #415, #419). Distinct from the Security category above, which covers CSP/Netlify/npm-audit but not Actions pinning or branch protection. |
| **Ops & maintenance**                        | Build warnings and deprecations, outdated majors Dependabot isn't handling, Netlify runtime config (404s, function schedules, env handling), date-based time bombs, monitoring gaps        | Real `npm run build` log + `npm outdated` + static reading of `netlify.toml`/`netlify/functions/`                                                                                                                                                                                                                                                                                                               | Validated (full pass 2026-09-24: #415, #416, co-found #409)                                                                                                                                                      |
| **Test & CI coverage gaps**                  | Whether CI would actually catch a realistic regression, per check and per documented invariant                                                                                             | Apply realistic mutations to a scratch copy (never the working tree), prove every CI check stays green, then propose the smallest check that catches it                                                                                                                                                                                                                                                         | Validated (full pass 2026-09-24: #411-#414)                                                                                                                                                                      |
| **Docs & agent-tooling accuracy**            | Whether CLAUDE.md, README, LEARNINGS.md, skills and hooks still match the code they describe                                                                                               | Verify each claim against the file on disk and by running the command or hook, not against a CLAUDE.md snapshot injected into the agent's context, which can be stale                                                                                                                                                                                                                                           | Validated (full pass 2026-09-24: #405-#410, co-found #419)                                                                                                                                                       |
| **Alternative display modes**                | Whether navigation, state cues and content survive forced colors (Windows High Contrast), JavaScript disabled, print and browser zoom                                                      | Playwright against a built site (`astro preview --port <N>` after `npm run build`, so no dev toolbar or dev bundle): `emulateMedia({ forcedColors: 'active' })` (Chromium only), `javaScriptEnabled: false`, `emulateMedia({ media: 'print' })`, and narrow viewports as an approximation of 400% zoom, which Playwright can't emulate. Compare screenshots between states rather than trusting ARIA attributes | Validated (full pass 2026-09-24: #420, #421)                                                                                                                                                                     |
| **DNS & email**                              | Mail-authentication records (SPF, DMARC, MX or null MX) and other public DNS records for the domain, i.e. whether anyone can spoof mail from it                                            | Real `dig` queries against public DNS + grep of `src/`, `public/` and `netlify/` for any mail the site actually sends or publishes                                                                                                                                                                                                                                                                              | Validated (full pass 2026-09-24: #422). Fixes are registrar-side DNS changes only the owner can make.                                                                                                            |
| **Content consistency**                      | Facts that contradict each other or their sources across case studies, principles, `src/data/` and captions (dates, years, roles), and quotes that drift from the recommendation they cite | Cross-read every content file against the others, `src/data/recommendations.ts` and each case study's `.sources.txt`, checking each date against its cited source                                                                                                                                                                                                                                               | Validated (full pass 2026-09-24: #423; #393 and #394 came from that pass's UX/content agent). Owns cross-checking facts between files and against sources; UX/UI, content, SEO reads each page for clarity.      |
| **Fix completeness** (round 2)               | Whether recently closed issues landed every point of their own suggested fix, and whether ticked checklist items actually merged                                                           | Read each closed issue's fix and acceptance points against the merged diff and `HEAD`, then prove each gap by running the code or a scoped test                                                                                                                                                                                                                                                                 | Validated (2026-09-25: #551; round 1's #489 was the same pattern)                                                                                                                                                |
| **Visitor journeys** (round 2)               | Multi-step sequences: Back/Forward and fragment links under ClientRouter, form state across navigation, viewport and input-mode changes with an overlay open                               | Playwright on a built site, one scripted step list per persona, checking DOM/ARIA state after every step rather than only on the final page                                                                                                                                                                                                                                                                     | Validated (2026-09-25: #545-#547, comment on #532)                                                                                                                                                               |
| **Content-authoring dry run** (round 2)      | Code paths that exist but have never run in production (the first published blog post, a fifth case study, edge-case content)                                                              | Follow the `add-content` skill literally in a throwaway checkout, build, and check every surface the new content reaches                                                                                                                                                                                                                                                                                        | Validated (2026-09-25: #534-#538, #544, comment on #481)                                                                                                                                                         |
| **Tooling blind spots** (round 2)            | Files no quality gate touches, and checks that pass vacuously                                                                                                                              | Map each tracked file to the gates that cover it, plant a realistic mistake in each gap and show every CI command stays green                                                                                                                                                                                                                                                                                   | Validated (2026-09-25: #539-#544)                                                                                                                                                                                |
| **Devil's advocate** (round 2)               | Round 1's "clean" conclusions and rejections, and angles no category took (e.g. a larger browser default font size)                                                                        | Re-check sample-based Ruled-out items exhaustively, and re-test a few rejections for new evidence                                                                                                                                                                                                                                                                                                               | Validated (2026-09-25: #548-#550)                                                                                                                                                                                |

Explicitly out of scope: internationalization/i18n — this site is single-language by design.

**The round-2 rows need round 1's results as input**, which is why they run as a second, smaller
wave after round 1 is verified and filed, not alongside it: give each round-2 agent round 1's
findings, verdicts and every category's "Ruled out" list, and tell it not to re-report any of
it. On 2026-09-25 the five lenses found 18 more issues that no round-1 category was positioned to
see (never-run publish paths, multi-step navigation state, gates that pass vacuously, a larger
default font size). Verify and file them the same way (§3, §5).

If new categories prove valuable in a future run, add them to this table (with `Status:
Validated` once actually run) rather than letting them live only in a conversation transcript.

## 2. Launch every chosen category in parallel

One `Agent` tool call per category, `subagent_type: general-purpose`, all in a single message so
they run concurrently. Each agent's prompt must include:

1. **Read `CLAUDE.md` and `LEARNINGS.md` in full first.** This repo documents an enormous number
   of already-fixed issues and deliberate, considered decisions across every category above — an
   agent that skips this will waste its own effort re-discovering settled things and get rejected
   at verification.
2. **Run `gh issue list --state all --limit 300` and cross-check against it** before finalizing
   any finding, not just at the start — don't re-file a closed issue's topic, and don't duplicate
   a currently-open one (`gh issue list --state open` — check what's open right now, the count
   grows over time). Where there's no `gh` (cloud sessions), fetch every issue once with the
   GitHub MCP `list_issues` tool into a scratchpad file that all agents read.
3. **Do the real thing, not the guessed thing.** Read actual files at actual line numbers, run
   the actual tool, inspect actual built output (`npm run build` then `dist/`). Every finding
   needs evidence that was actually observed this run, not paraphrased from memory of what the
   code probably does.
4. **A structured output format** written to a scratchpad file (not the repo) — title, category,
   severity, files, description, evidence, suggested fix, confidence. Quality over quantity: an
   empty or short findings list is a valid, useful outcome, not a failure.
5. **Strict cleanup discipline** (see §4) — this has gone wrong in practice, don't skip it.

Past audits' prompts aren't stored in the repo, so ask the user whether they have one to reuse
as a template for depth and specificity — a thin one-line brief produces a thin audit.

### Port/process coordination

Categories that start a server (performance, cross-browser, accessibility-tree, alternative
display modes, and test & CI coverage or docs & tooling whenever they run `npm test`) running in
the same wave must not share one. **Never reuse whatever is already listening on port 4321.**
Per CLAUDE.md's Testing section, a stray server there is exactly how the Vite dependency cache
gets corrupted when another agent runs `npm run build`, and Playwright's `webServer` silently
reuses it (`reuseExistingServer` is on outside CI). What worked in practice (2026-09-24 audit):

- **Each server-needing agent gets its own port**, named in its prompt (e.g. 4331, 4332, …),
  and its own checkout (see the worktree note below).
- **Playwright runs through an untracked override config inside that agent's own checkout**, e.g.
  `playwright.audit.config.ts` spreading the config it overrides (and `...base.webServer`, so
  `env: { ASTRO_DEV_BACKGROUND: '1' }` survives) with `use.baseURL`, `webServer.url` and
  `webServer.command` (`npm run dev:astro -- --port <N>`) pointed at its port and
  `reuseExistingServer: false`, run with `npx playwright test --config=<file>`. The contrast scan
  is separate: `playwright.contrast.config.ts` and `e2e/contrast.global-setup.ts` both hardcode
  4321, so override that config and edit the setup file in the agent's own copy. Never put these
  files in a shared scratchpad location: parallel agents writing same-named files there
  overwrite each other's.
- **Cleanup is by PID**: `lsof -ti:<N>` for its own port only, then confirm the port is free.
  In a worktree, delete the override config too: it's the one file allowed inside a checkout
  rather than the scratchpad, and only while the agent runs (§4's `git status --porcelain` check
  still applies there).

The performance category is the outlier since it needs a production-accurate `Cache-Control`,
which no local server reproduces (see §4). Production (if it's confirmed running the same commit
as local `HEAD`) is usually the only authentic option, sidestepping the local-port question
entirely.

**Agent worktrees can disappear mid-run.** On 2026-09-24 a session interruption removed the
audit agents' `isolation: "worktree"` checkouts, taking anything not yet written elsewhere with
them. Have each agent append findings to its scratchpad output file as it goes, not only at the
end. To avoid worktrees entirely, give each agent a plain copy of the committed tree in its own
scratchpad subdirectory instead: `mkdir -p <scratchpad>/<category> && git archive HEAD | tar -x
-C <scratchpad>/<category>`, then `npm ci` there. Nothing cleans that up behind the agent's back,
and it can't touch the real checkout. The copy has no `.git` and is throwaway, so the
`git status --porcelain` check means the real checkout, which must still be clean.

## 3. Merge, then verify independently — don't skip straight to filing

1. Once all category agents finish, read every scratchpad output file yourself and merge into
   one candidate list. **Findings that two categories reach independently (e.g. an accessibility
   agent and an SEO agent both flagging the same heading-hierarchy bug from different angles) are
   a stronger signal, not a duplicate to silently drop** — merge into one entry, note the
   double-discovery.
2. Spawn **one independent verification agent** (or, if the merged list is large — say beyond
   ~15 findings — one verifier per category, mirroring the audit wave, to keep each agent's
   workload reviewable) with no memory of how the findings were produced. Its job: **reproduce**
   each finding from scratch (rerun the tool, reread the file, redo the calculation) rather than
   trusting the quoted evidence, and return a CONFIRMED / REJECTED / MODIFIED verdict with
   reasoning, a final severity, and suggested GitHub labels for each.
    - This step is not ceremony — it has caught real errors: a citation that overstated a byte
      count, a suggested fix that was scoped to the wrong element entirely (would have shipped a
      fix that solved the mobile case and silently missed the desktop case), and a finding that
      turned out to already be fixed by a just-merged PR the audit agent hadn't picked up.
3. Only findings the verifier marks CONFIRMED or MODIFIED become GitHub issues. Use the
   verifier's corrected description/severity for MODIFIED findings, not the original.

## 4. Gotchas learned the hard way

- **Never trust a background agent's "completed" status at face value.** One agent in this
  session's history stalled mid-task — it had taken real screenshots but then wrote something to
  the effect of "I'll stop and wait for a Monitor notification" and ended its turn without
  finishing the analysis, writing findings, or cleaning up, yet still reported `status:
completed`. Caught by checking its actual scratchpad output and process list, not by trusting
  its summary. If an agent's own report doesn't match what's actually on disk/in `ps aux`, resume
  it (`SendMessage` to its agent ID) with an explicit "do the work now, don't wait for anything"
  instruction rather than treating it as done or restarting from scratch.
- **CDP accessibility-tree specifics** (for the accessibility-tree category): `getFullAXTree`'s
  returned array is _not_ reading order — walk it via each node's `childIds` starting from
  `RootWebArea`, or you'll misreport reading-order bugs that aren't real.
  `RootWebArea` always reports `focused=true` whenever the document has focus, independent of
  which descendant — filter it out when looking for the true focused node, or cross-check against
  `document.activeElement` directly. `aria-current` never surfaces as a CDP `Accessibility`
  domain property at all, even on an isolated blank test page — a tooling limitation, not
  evidence a real screen reader misses it; don't report it as a site bug without a DOM-level
  cross-check first.
- **Local preview servers lie about headers, in different ways.** `astro preview` applies none of
  `netlify.toml`'s `[[headers]]`. `netlify serve` does send the real CSP, HSTS and
  X-Frame-Options, but its static server overrides every `Cache-Control` with its own
  `public, max-age=0` (re-tested 2026-09-24; see CLAUDE.md's `Cache-Control` bullet). Any
  category measuring caching needs production (after confirming it's running the same commit as
  local `HEAD`) or `@netlify/headers-parser` against the config, or an explicit caveat on the
  local-only result. CSP and security headers can be checked locally with `netlify serve`, unless
  it can't download Deno (behind the cloud-session proxy it builds, then crashes on the first
  request); then apply `@netlify/headers-parser`'s rules with a small local server.
- **Match CI's browser before reporting browser behavior.** A container's pre-installed Chromium
  can be much older than CI's (2026-09-25: 141 locally, 153 in CI), and five scroll-position
  tests failed locally on a clean `HEAD`. The npm package `@sparticuz/chromium@<CI's major>`
  provides a matching binary when browser downloads are blocked. Scripted and user-initiated
  paths differ too: a Medium "print leaves lazy images blank" finding held for `page.pdf()` and
  `window.print()` but not for a real Ctrl+P (driven in headful Chromium under Xvfb).
- **Without `gh`, the GitHub MCP issue tools rewrite text.** On 2026-09-25 they stripped a `!`
  directly before `[` (reversing a code snippet's logic), turned `\uXXXX` escapes into raw
  characters, stripped HTML-tag-like text from titles, HTML-escaped a full `<img ...>` tag inside
  inline code, and dropped the attribution footer from issue bodies (not from comments). They
  also can't read rulesets. Scan drafts for these patterns before filing, and read every filed
  issue back and compare it with the draft.
- **Scratchpad-only, always.** Screenshots, JSON reports, temp scripts, logs — all go in the
  scratchpad directory, never the repo. Confirm `git status --porcelain` is clean before an agent
  (audit or verification) reports itself done. This includes not leaving stray `.tmp-*` files at
  the repo root.
- **Don't touch processes you didn't start.** Before killing anything, check its elapsed time /
  whether this session's own script launched it — a long-running personal dev server or editor
  process can predate the audit by many hours and has nothing to do with it.
- **Use only the existing label set** — `security`, `accessibility`, `performance`, `testing`,
  `tech-debt`, `documentation`, `bug`, `enhancement`, `priority-high`, `priority-medium`,
  `priority-low`. Don't invent new labels; combine exactly one type label with exactly one
  priority label per issue. Use `documentation` only for a finding that is purely about docs,
  skills or agent-tooling accuracy: prose or instructions in CLAUDE.md, README, LEARNINGS.md or
  `.claude/` that no longer match reality. A hook or script that is itself broken is a `bug`, as
  is a doc that's wrong because the code has a bug. `dependencies` is Dependabot's PR label, not
  for audit issues.

## 5. File one GitHub issue per confirmed finding

One topic per issue — don't bundle unrelated findings to save issue count. Match this repo's
established issue-body style (see any of #174-191, or #105, for real examples):

```markdown
**Severity:** <Low|Medium|High|Critical>

<Concrete description of what's wrong, with real evidence — code snippets, command output,
measured numbers — not a restatement of the title.>

**Suggested fix:** <concrete, specific>

---

Found via a targeted <category> audit and independently reproduced during a separate
verification pass (<date>).
```

Use `gh issue create --title "..." --label "type,priority" --body "$(cat <<'EOF' ... EOF)"` —
the quoted heredoc avoids shell-interpolating backticks/`$` in code snippets inside the body.

## 6. Report back

A short table: issue number, title, severity, per issue filed. Note anything investigated and
explicitly ruled out (a "clean" result in a category, or a candidate finding the verifier
rejected) — that's real signal too, not just the filed issues. State plainly if a category was
skipped and why (not asked for, or a prerequisite tool/permission wasn't available).
