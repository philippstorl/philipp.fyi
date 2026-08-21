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

Developed and refined across three audit passes (2026-08-21, issues #174-191). The single most
important lesson from that history: **run every chosen category in one parallel wave, not
sequential rounds.** Rounds only happened that first time because the categories were decided
one at a time in conversation — nothing about the categories themselves requires sequencing.
Pick every category worth running this time and launch them together.

## 1. Pick categories

Ask the user, or infer from their request, which categories to run. Default to **all validated
categories** for "do a full audit"; run a subset for a targeted request ("check performance
again", "audit accessibility"). Categories marked _proposed_ haven't been run against this repo
yet — mention them as available options rather than silently including or excluding them.

| Category                                     | What it checks                                                                                                                                                          | Method                                                                                                                                                                 | Status                                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**                                 | CSP/headers, Netlify Functions (injection, auth, signature verification), secrets, `npm audit`, dependency vulns, GitHub repo security settings                         | Static reading + real `gh api`/`npm audit` runs                                                                                                                        | Validated                                                                                                                                                           |
| **Accessibility & semantic HTML**            | Heading hierarchy, landmarks, ARIA correctness, alt text, list/button/link semantics, focus order                                                                       | Static reading, spot-check contrast math                                                                                                                               | Validated                                                                                                                                                           |
| **Code quality, bugs, refactoring**          | Logic bugs, dead code, duplication, TS quality, error-handling gaps, lint/typecheck/build health                                                                        | Static reading + running `typecheck`/`lint`/`build`                                                                                                                    | Validated                                                                                                                                                           |
| **UX/UI, content, SEO**                      | Copy clarity, broken/dead links, meta tags, structured data, responsive breakpoints, error/empty states                                                                 | Static reading + built-output inspection                                                                                                                               | Validated                                                                                                                                                           |
| **Real performance measurement**             | Actual Lighthouse scores, Core Web Vitals, unused JS/CSS, cache headers, request waterfall                                                                              | Real Lighthouse run against a live build (see §4 gotchas — local preview servers don't apply `netlify.toml` headers, so production is often the only authentic target) | Validated                                                                                                                                                           |
| **Cross-browser / responsive visual QA**     | Real rendering differences (color functions, CSS features, animations) across engines, not just Chromium                                                                | Playwright screenshots in Chromium + Firefox + WebKit, visually reviewed                                                                                               | Validated                                                                                                                                                           |
| **Dependency license audit**                 | Copyleft/unknown licenses in shipped code vs. build-only tooling, attribution gaps                                                                                      | Real `license-checker` run + grep of built JS for stripped license banners                                                                                             | Validated                                                                                                                                                           |
| **Accessibility tree (screen-reader proxy)** | What a real screen reader actually receives — reading order, redundant/missing announcements, live-region behavior, state exposure — not axe DOM rules                  | Playwright + a raw CDP session (`Accessibility.getFullAXTree`) against Chromium; see §4 gotchas for the sharp edges                                                    | Validated                                                                                                                                                           |
| **Legal & compliance**                       | Impressum/DDG requirements, GDPR/cookie consent posture, privacy policy for contact-form data (Netlify Forms retention), whether an accessibility statement is expected | Research + static reading                                                                                                                                              | _Proposed_ — not yet run as a full pass. Some informal impressum research already exists (issue #61); check it before re-researching from scratch.                  |
| **CI/CD & supply-chain hardening**           | GitHub Actions pinned by tag vs. commit SHA, branch protection / required status checks on `main`, `npm ci` vs `npm install` in CI, secrets exposure in Action logs     | Static reading of `.github/workflows/*.yml` + `gh api` for branch protection settings                                                                                  | _Proposed_ — not yet run. Distinct from the Security category above, which covered CSP/Netlify/npm-audit but not Actions-pinning or branch protection specifically. |

Explicitly out of scope: internationalization/i18n — this site is single-language by design
(see CLAUDE.md).

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
   grows over time).
3. **Do the real thing, not the guessed thing.** Read actual files at actual line numbers, run
   the actual tool, inspect actual built output (`npm run build` then `dist/`). Every finding
   needs evidence that was actually observed this run, not paraphrased from memory of what the
   code probably does.
4. **A structured output format** written to a scratchpad file (not the repo) — title, category,
   severity, files, description, evidence, suggested fix, confidence. Quality over quantity: an
   empty or short findings list is a valid, useful outcome, not a failure.
5. **Strict cleanup discipline** (see §4) — this has gone wrong in practice, don't skip it.

Use the three rounds' actual prompts (this conversation's history, or ask the user to point back
to it) as templates for prompt depth and specificity — a thin one-line brief produces a thin
audit.

### Port/process coordination

Categories that need a live site (performance, cross-browser, accessibility-tree) running in the
same wave can collide on the same port. In practice this worked out as: each agent checks
`curl -sf http://localhost:4321 >/dev/null && echo running` first and **reuses** an existing dev
server rather than starting a duplicate (`astro dev` errors "Another astro dev server is already
running" if you don't check first); the performance category is the outlier since it needs a
`netlify.toml`-header-accurate target, which neither `astro preview` nor local `netlify serve`
provides — production (if it's confirmed running the same commit as local `HEAD`) is usually the
only authentic option, sidestepping the local-port question entirely. Tell every server-needing
agent explicitly which port to expect/use and to reuse rather than duplicate.

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
- **Local preview servers lie about headers.** `astro preview` and `netlify serve` don't apply
  `netlify.toml`'s `[[headers]]` rules — confirmed via `curl -I`, both return wrong
  `Cache-Control` and no CSP at all where production returns the real thing. Any category
  measuring headers/CSP/caching needs to target production (after confirming it's running the
  same commit as local `HEAD`) or explicitly caveat the local-only result.
- **Scratchpad-only, always.** Screenshots, JSON reports, temp scripts, logs — all go in the
  scratchpad directory, never the repo. Confirm `git status --porcelain` is clean before an agent
  (audit or verification) reports itself done. This includes not leaving stray `.tmp-*` files at
  the repo root.
- **Don't touch processes you didn't start.** Before killing anything, check its elapsed time /
  whether this session's own script launched it — a long-running personal dev server or editor
  process can predate the audit by many hours and has nothing to do with it.
- **Use only the existing label set** — `security`, `accessibility`, `performance`, `testing`,
  `tech-debt`, `bug`, `enhancement`, `priority-high`, `priority-medium`, `priority-low`. Don't
  invent new labels; combine exactly one type label with exactly one priority label per issue.

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
