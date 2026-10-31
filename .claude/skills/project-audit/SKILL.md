---
name: project-audit
description: Run a full or targeted repository audit of philipp.fyi (security, accessibility, performance, code quality, UX/SEO, and more) using independent parallel agents, an independent verification pass, and GitHub issues for confirmed findings — or re-validate the open issue backlog against the current code. Use when asked to audit, review, or find issues across the whole codebase, or to check whether open issues are still relevant — not for reviewing a single diff (use self-review/code-review for that).
---

# Project audit

A full-repository audit, distinct from `self-review`/`code-review`: those review a diff against
what was just written, this reviews the whole live site/codebase against the categories below,
independent of any recent change. Runs as multiple parallel agents in the current session (not
forked) because it needs to spawn sub-agents itself and create real GitHub issues at the end —
actions the user should see happen, not something buried inside an isolated fork.

It has two modes:

- **Audit** (§1-§6): find new problems and file them.
- **Re-validate** (§7): check every open issue against the current code, then close, update or
  group them.

Developed and refined across these runs:

- three audit passes on 2026-08-21 (issues #174-191)
- a full pass on 2026-09-24 (#388-#423)
- a full pass plus a second-wave review on 2026-09-25 (#470-#551)
- a re-validation of that backlog on 2026-10-31 (#576-#578)

Two lessons matter most:

- **Run every chosen category in one parallel wave, not sequential rounds.** Rounds only happened
  the first time because the categories were decided one at a time in conversation; nothing
  about the categories themselves requires sequencing.
- **Volume is a cost, not a score.** The 2026-09-25 pass filed about 80 priority-low issues. Five
  weeks later 77 still reproduced and none had been fixed, and the re-validation folded 17 of
  them into three checklists. §5 has the filing rules that came out of it.

## 1. Pick categories

Ask the user, or infer from their request, which categories to run. Default to **all validated
categories** for "do a full audit"; run a subset for a targeted request ("check performance
again", "audit accessibility"). A new category starts out marked _Proposed_ until it has run
as a full pass; mention any such category as an available option rather than silently including
or excluding it.

| Category                                     | What it checks                                                                                                                                                                             | Method                                                                                                                                                                                                                                                                                                                                                                                                          | Status                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**                                 | CSP/headers, Netlify Functions (injection, auth, signature verification), secrets, `npm audit`, dependency vulns, GitHub repo security settings                                            | Static reading + real `gh api`/`npm audit` runs. Use `npm audit` against the lockfile, not Dependabot's alert list, which keeps alerts open for versions the lockfile already moved past                                                                                                                                                                                                                        | Validated                                                                                                                                                                                                                                                            |
| **Accessibility & semantic HTML**            | Heading hierarchy, landmarks, ARIA correctness, alt text, list/button/link semantics, focus order                                                                                          | Static reading, spot-check contrast math. CI's blocking axe scan (`e2e/a11y.spec.ts`, #558) already covers axe's rules on every page's first-load state, so aim at what it can't see: open overlays, states after interaction, focus behavior, whether names and alts make sense                                                                                                                                | Validated                                                                                                                                                                                                                                                            |
| **Code quality, bugs, refactoring**          | Logic bugs, dead code, duplication, TS quality, error-handling gaps, lint/typecheck/build health                                                                                           | Static reading + running `typecheck`/`lint`/`build`                                                                                                                                                                                                                                                                                                                                                             | Validated                                                                                                                                                                                                                                                            |
| **UX/UI, content, SEO**                      | Copy clarity, broken/dead links, meta tags, structured data, responsive breakpoints, error/empty states                                                                                    | Static reading + built-output inspection                                                                                                                                                                                                                                                                                                                                                                        | Validated                                                                                                                                                                                                                                                            |
| **Real performance measurement**             | Actual Lighthouse scores, Core Web Vitals, unused JS/CSS, cache headers, request waterfall                                                                                                 | Real Lighthouse run against a live build (see §4 gotchas: no local server reproduces production `Cache-Control`, so production is often the only authentic target)                                                                                                                                                                                                                                              | Validated                                                                                                                                                                                                                                                            |
| **Cross-browser / responsive visual QA**     | Real rendering differences (color functions, CSS features, animations) across engines, not just Chromium                                                                                   | Playwright screenshots in Chromium + Firefox + WebKit, visually reviewed                                                                                                                                                                                                                                                                                                                                        | Validated                                                                                                                                                                                                                                                            |
| **Dependency license audit**                 | Copyleft/unknown licenses in shipped code vs. build-only tooling, OFL metadata in shipped fonts, third-party material in the public repo (#487)                                            | Real `license-checker` run + reading `LICENSE` against what the repo contains                                                                                                                                                                                                                                                                                                                                   | Validated. Missing MIT/ISC notices in the served bundle are a settled won't-fix (#189; PR #204 closed unmerged), even though GitHub shows #189 as "completed". Don't re-file it.                                                                                     |
| **Accessibility tree (screen-reader proxy)** | What a real screen reader actually receives — reading order, redundant/missing announcements, live-region behavior, state exposure — not axe DOM rules                                     | Playwright + a raw CDP session (`Accessibility.getFullAXTree`) against Chromium; see §4 gotchas for the sharp edges                                                                                                                                                                                                                                                                                             | Validated                                                                                                                                                                                                                                                            |
| **Legal & compliance**                       | GDPR/cookie consent posture, privacy policy accuracy for every data flow (contact form, RUM, analytics, CSP reports), whether an accessibility statement is expected                       | Research + static reading                                                                                                                                                                                                                                                                                                                                                                                       | Validated (#302; full passes 2026-09-24: #401-#404, 2026-09-25: #485, #486). No Impressum by owner decision (#61, closed not planned 2026-09-25: private self-presentation, Abmahnung risk accepted). Don't re-file it unless one of #61's revisit triggers applies. |
| **CI/CD & supply-chain hardening**           | GitHub Actions pinned by tag vs. commit SHA, branch protection / required status checks on `main`, `npm ci` vs `npm install` in CI, secrets exposure in Action logs, install scripts       | Static reading of `.github/workflows/*.yml` + `gh api` for the ruleset (`repos/<owner>/<repo>/rulesets`, readable with the normal `repo` scope)                                                                                                                                                                                                                                                                 | Validated (#303, #304; full pass 2026-09-24: #417, #418, co-found #409, #415, #419). Distinct from the Security category above, which covers CSP/Netlify/npm-audit but not Actions pinning or branch protection.                                                     |
| **Ops & maintenance**                        | Build warnings and deprecations, outdated majors Dependabot isn't handling, Netlify runtime config (404s, function schedules, env handling), date-based time bombs, monitoring gaps        | Real `npm run build` log + `npm outdated` + static reading of `netlify.toml`/`netlify/functions/`                                                                                                                                                                                                                                                                                                               | Validated (full pass 2026-09-24: #415, #416, co-found #409)                                                                                                                                                                                                          |
| **Test & CI coverage gaps**                  | Whether CI would actually catch a realistic regression, per check and per documented invariant                                                                                             | Apply realistic mutations to a scratch copy (never the working tree), run lint and format on the mutation too, prove every CI check stays green, then propose the smallest check that catches it                                                                                                                                                                                                                | Validated (full passes 2026-09-24: #411-#414, 2026-09-25: grouped into #576/#577). File same-shape gaps as one checklist (§5).                                                                                                                                       |
| **Check-script blind spots**                 | Whether each `check:*` script and hook rejects everything it claims to: inputs it silently accepts, cases its derivation skips, failures its wrapper hides                                 | Read each script, then feed it crafted bad input in a scratch copy                                                                                                                                                                                                                                                                                                                                              | Validated (2026-09-25 second wave: #539-#544, all reproduced 2026-10-31)                                                                                                                                                                                             |
| **Content-authoring dry run**                | Whether the `add-content` workflow produces a correct page: follow it end to end for a new case study and a published blog post, then inspect what ships                                   | Scratch copy: publish a draft or add a test entry, build, inspect `dist/` and the rendered page                                                                                                                                                                                                                                                                                                                 | Validated (2026-09-25 second wave: #534-#538, all reproduced 2026-10-31). Blog findings are latent while every post is a draft; say so in the issue.                                                                                                                 |
| **Visitor journeys**                         | Multi-page flows a single-page check misses: Back/Forward, BFCache, anchors after a client-side nav, drafts surviving navigation                                                           | Playwright clicking through the built site (not `page.goto()`), on desktop and Pixel 5                                                                                                                                                                                                                                                                                                                          | Validated (2026-09-25 second wave: #545-#547)                                                                                                                                                                                                                        |
| **Docs & agent-tooling accuracy**            | Whether CLAUDE.md, README, LEARNINGS.md, skills and hooks still match the code they describe                                                                                               | Verify each claim against the file on disk and by running the command or hook, not against a CLAUDE.md snapshot injected into the agent's context, which can be stale                                                                                                                                                                                                                                           | Validated (full pass 2026-09-24: #405-#410, co-found #419)                                                                                                                                                                                                           |
| **Alternative display modes**                | Whether navigation, state cues and content survive forced colors (Windows High Contrast), JavaScript disabled, print and browser zoom or a larger default font size                        | Playwright against a built site (`astro preview --port <N>` after `npm run build`, so no dev toolbar or dev bundle): `emulateMedia({ forcedColors: 'active' })` (Chromium only), `javaScriptEnabled: false`, `emulateMedia({ media: 'print' })`, and narrow viewports as an approximation of 400% zoom, which Playwright can't emulate. Compare screenshots between states rather than trusting ARIA attributes | Validated (full pass 2026-09-24: #420, #421)                                                                                                                                                                                                                         |
| **DNS & email**                              | Mail-authentication records (SPF, DMARC, MX or null MX) and other public DNS records for the domain, i.e. whether anyone can spoof mail from it                                            | Real `dig` queries against public DNS + grep of `src/`, `public/` and `netlify/` for any mail the site actually sends or publishes                                                                                                                                                                                                                                                                              | Validated (full pass 2026-09-24: #422). Fixes are registrar-side DNS changes only the owner can make; they're tracked in #578.                                                                                                                                       |
| **Content consistency**                      | Facts that contradict each other or their sources across case studies, principles, `src/data/` and captions (dates, years, roles), and quotes that drift from the recommendation they cite | Cross-read every content file against the others, `src/data/recommendations.ts` and each case study's `.sources.txt`, checking each date against its cited source                                                                                                                                                                                                                                               | Validated (full pass 2026-09-24: #423; #393 and #394 came from that pass's UX/content agent). Owns cross-checking facts between files and against sources; UX/UI, content, SEO reads each page for clarity.                                                          |

Explicitly out of scope: internationalization/i18n — this site is single-language by design.

If new categories prove valuable in a future run, add them to this table (with `Status:
Validated` once actually run) rather than letting them live only in a conversation transcript.

## 2. Launch every chosen category in parallel

One `Agent` tool call per category, `subagent_type: general-purpose`, all in a single message so
they run concurrently. Each agent's prompt must include:

1. **Read `CLAUDE.md` and `LEARNINGS.md` in full first, from disk.** This repo documents an
   enormous number of already-fixed issues and deliberate, considered decisions across every
   category above — an agent that skips this will waste its own effort re-discovering settled
   things and get rejected at verification.
2. **Run `gh issue list --state all --limit 1000` and cross-check against it** before finalizing
   any finding, not just at the start — don't re-file a closed issue's topic, and don't duplicate
   a currently-open one. The list doesn't show why an issue was closed: owner decisions often live
   only in a closed issue's top-of-body status section or last comment, so read closed issues on
   the same topic with `gh issue view <N> --json body,comments,stateReason` (`--comments` alone
   has printed nothing in some shells).
3. **Do the real thing, not the guessed thing.** Read actual files at actual line numbers, run
   the actual tool, inspect actual built output (`npm run build` then `dist/`). Every finding
   needs evidence that was actually observed this run, not paraphrased from memory of what the
   code probably does.
4. **Evidence that survives a few weeks** (from the 2026-10-31 re-validation, where these were
   the parts of otherwise correct issues that had gone stale):
    - Cite test and function names alongside line numbers. Line numbers drifted within days.
    - Don't pin dependency versions, byte counts or commit SHAs unless the finding is about them.
    - Record the browser version for anything that depends on browser heuristics (lazy-load
      margins, font-loading timing). Those numbers changed between Chromium versions.
    - Confirm with `gh api` instead of filing "verify that X". The rulesets API was readable all
      along.
    - Say when a claim wasn't checked on a real device, and when a finding is latent (e.g. it
      only shows once a blog post is published).
    - Link related findings to each other, and don't make one fix depend on another
      ("do #N first"). That sequencing goes stale as soon as #N merges.
5. **A structured output format** written to a scratchpad file (not the repo), appended after
   each finding rather than only at the end — title, category, severity, files, description,
   evidence, suggested fix, confidence. Quality over quantity: an empty or short findings list is
   a valid, useful outcome, not a failure.
6. **Strict cleanup discipline** (see §4) — this has gone wrong in practice, don't skip it.

A thin one-line brief produces a thin audit. Start from this template and add the category's
own focus, method and any §4 gotchas that apply:

```text
You are auditing the philipp.fyi repo (<repo path>, branch main at <sha>, clean) for
<category>: <what it checks, from the table>. Method: <method, from the table>.

1. Read CLAUDE.md and LEARNINGS.md from disk first; many things are already fixed or decided.
2. Before finalizing each finding, check `gh issue list --state all --limit 1000`, and read any
   closed issue on the same topic with `gh issue view <N> --json body,comments,stateReason`.
3. Reproduce everything for real this run (file:line, command output, measurements). Follow the
   evidence rules: test/function names with line numbers, no pinned versions unless relevant,
   browser version for heuristics, latent/not-on-a-device caveats.
4. Never build, mutate or run a server in the real checkout. Work in
   <scratchpad>/<category> (`git archive HEAD | tar -x -C ...`, then `npm ci`). Server port:
   <N> only, Playwright with --reporter=line via an override config in that copy. Kill your own
   processes by PID when done; don't touch processes you didn't start.
5. Read-only toward GitHub: don't create, edit, comment on or close issues.
6. Append each finding to <scratchpad>/<category>.md as you go: title, category, severity,
   files, description, evidence, suggested fix, confidence. An empty list is a valid result.
7. Before finishing: `git -C <repo path> status --porcelain` is empty and nothing you started is
   still listening on <N>. Final message: one line per finding.
```

### Port/process coordination

Categories that start a server (performance, cross-browser, accessibility-tree, alternative
display modes, visitor journeys, and test & CI coverage or docs & tooling whenever they run
`npm test`) running in the same wave must not share one. **Never reuse whatever is already
listening on port 4321.** Per CLAUDE.md's Testing section, a stray server there is exactly how
the Vite dependency cache gets corrupted when another agent runs `npm run build`, and
Playwright's `webServer` silently reuses it (`reuseExistingServer` is on outside CI). What worked
in practice (2026-09-24 audit, 2026-10-31 re-validation):

- **Each server-needing agent gets its own port**, named in its prompt (e.g. 4341, 4342, …),
  and its own copy of the tree (see the worktree note below).
- **Playwright runs through an untracked override config inside that agent's own copy**, e.g.
  `playwright.audit.config.ts` spreading the config it overrides (and `...base.webServer`, so
  `env: { ASTRO_DEV_BACKGROUND: '1' }` survives) with `use.baseURL`, `webServer.url` and
  `webServer.command` (`npm run dev:astro -- --port <N>`) pointed at its port and
  `reuseExistingServer: false`, run with `npx playwright test --config=<file>`. Both
  `playwright.config.ts` and `playwright.contrast.config.ts` hardcode 4321; their global setups
  don't, since `e2e/helpers/warm-dev-server.ts` reads `baseURL` from the config, so overriding
  the config is enough. That warmup visits every page in `scripts/contrast-pages.mjs` before any
  worker starts, which adds a few seconds per run. Never put these files in a shared scratchpad
  location: parallel agents writing same-named files there overwrite each other's.
- **Run Playwright with `--reporter=line`** (or set `reporter: 'line'` in the override). The base
  config's `html` reporter, outside CI, serves the report after any failure and blocks until
  Ctrl+C, which hangs an agent whose mutation runs are meant to fail.
- **A script that only needs a built site** (screenshots, measurements, CDP) can skip Playwright
  Test: `npm run build && npx astro preview --port <N>` in the copy, with the scripts in a
  separate scratchpad folder.
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
2. Optionally, spawn one **gaps reviewer** with the merged list: it looks for what no category
   owned (e.g. a larger default font size, a 404 under a section URL; #548-#550 came from one).
   It doesn't need to wait for anything else, so run it while the verifier works.
3. Spawn **one independent verification agent** (or, if the merged list is large — say beyond
   ~15 findings — one verifier per category, mirroring the audit wave, to keep each agent's
   workload reviewable) with no memory of how the findings were produced. Its job: **reproduce**
   each finding from scratch (rerun the tool, reread the file, redo the calculation) rather than
   trusting the quoted evidence, and return a CONFIRMED / REJECTED / MODIFIED verdict with
   reasoning, a final severity, and suggested GitHub labels for each.
    - This step is not ceremony — it has caught real errors: a citation that overstated a byte
      count, a suggested fix that was scoped to the wrong element entirely (would have shipped a
      fix that solved the mobile case and silently missed the desktop case), and a finding that
      turned out to already be fixed by a just-merged PR the audit agent hadn't picked up.
4. Only findings the verifier marks CONFIRMED or MODIFIED become GitHub issues. Use the
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
  local-only result. CSP and security headers can be checked locally with `netlify serve`.
- **Injecting a test stylesheet into a built page needs `bypassCSP: true`** on the browser
  context: the CSP `<meta>` tag blocks `page.addStyleTag()` otherwise.
- **`/contact/` has two `form[name="contact"]` elements**: the hidden Netlify detection form comes
  first, so a plain `querySelector` reads the wrong one. Target
  `form[name="contact"]:has(button[type=submit])` or `:not([hidden])`.
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

## 5. File confirmed findings

One topic per issue: don't bundle unrelated findings to save issue count. But group findings of
the same shape into one checklist issue, with one checkbox per finding:

- missing test guards for bugs that are already fixed (e.g. #576)
- new checks over `dist/` that could share one script (e.g. #577)
- anything only the owner can do: DNS, the Netlify dashboard, GitHub settings (e.g. #578)

Keep a finding as its own issue when its fix needs a design decision.

**Before filing more than about 15 priority-low issues, ask the user**: show the list and offer
to file the top ones, group more, or drop the rest. Low findings that nobody is going to fix soon
still cost a re-validation later.

Match this repo's established issue-body style (see any of #174-191, or #105, for real
examples):

```markdown
**Severity:** <Low|Medium|High|Critical>

<Concrete description of what's wrong, with real evidence — code snippets, command output,
measured numbers — not a restatement of the title.>

**Suggested fix:** <concrete, specific>

---

Found via a targeted <category> audit and independently reproduced during a separate
verification pass (<date>).
```

Use `gh issue create --title "..." --label "type,priority" --body-file <scratchpad file>` (or a
quoted heredoc), so backticks and `$` in code snippets aren't shell-interpolated.

## 6. Report back

A short table: issue number, title, severity, per issue filed. Note anything investigated and
explicitly ruled out (a "clean" result in a category, or a candidate finding the verifier
rejected) — that's real signal too, not just the filed issues. State plainly if a category was
skipped and why (not asked for, or a prerequisite tool/permission wasn't available).

## 7. Re-validate the open backlog

Use this when asked whether the open issues are still relevant, or before a new audit when many
issues are open. First run on 2026-10-31: 80 open issues, 1 fixed, 2 partly fixed, 77 still
valid, 14 with stale bodies.

1. **Calibrate first.** `gh issue list --state open --limit 1000 --json number,title,labels,createdAt`,
   then `git log --since=<oldest filing date> --oneline` without the `chore(deps` lines, noting
   when each issue was filed relative to the fix commits. Issues filed after a day's fixes can
   only have been fixed by later commits, including Dependabot bumps (#508 was fixed by its own
   dependency bump).
2. **Batch by area**, about 13 issues per agent (security/CI/infra, docs and tooling, test gaps,
   accessibility, UX and content, performance and the rest), all launched in one message. Use
   §2's template with these changes:
    - The task is to reproduce each listed issue against current `main`, starting with
      `gh issue view <N> --json body,comments` and
      `git log --since=<filed date> -- <cited paths>`.
    - Strictly read-only toward GitHub.
    - One port and scratch copy per agent, as in §2.
    - Per issue, append to `<scratchpad>/<batch>.md`:

        ```text
        ## #N - <title>
        Verdict: STILL_VALID | FIXED | PARTIALLY_FIXED | OBSOLETE | NOT_REPRODUCIBLE
        Evidence: <observed this run>
        Fixed by: <commit/PR>
        Body accuracy: accurate | stale details: <list>
        Severity/labels: keep | change to <...>
        Recommended action: keep open | close as completed | close as not planned | keep open + edit body
        Confidence: high | medium | low
        ```

    - End with notes for this skill.
3. **Verify every close or partly-fixed verdict yourself** before acting on it (rerun the check),
   and read the agents' skill notes into this file.
4. **Ask the user before changing GitHub**, offering: close the fixed ones, update stale bodies,
   group same-shape issues (§5), or nothing.
5. **Apply**, following the owner's issue-update style:
    - Back up every body you touch to the scratchpad first.
    - Status goes at the top of the description, never as a comment: a one- or two-line
      `> [!NOTE]` headline, then plain bullets or tables, then `---` and the original body.
    - Fixed issues: close with `--reason completed`, after a status line naming the commit/PR.
    - Grouped issues: create the checklist issue with refreshed evidence, put a "Moved to #N"
      status on each original, and close it with `gh issue close <n> --duplicate-of <N>`.
6. **Report** a verdict table, plus what changed on GitHub.
