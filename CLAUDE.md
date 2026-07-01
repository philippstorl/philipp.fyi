# CLAUDE.md

Guidance for Claude Code when working in this repository. For setup, the full npm scripts table, and content-editing walkthroughs, see [README.md](README.md) — this file covers conventions and gotchas that aren't obvious from a first read.

## Learnings

[LEARNINGS.md](LEARNINGS.md) is a dated, append-only log of what was discovered while working on this repo — decisions and their reasoning, dead ends, domain knowledge about the tooling itself, open questions. It's distinct from this file (current-state instructions, kept in sync via `doc-sync`) and from Claude's own cross-session memory (feedback about working style) — don't duplicate either of those into it. A `SessionStart` hook reads it into context automatically; a `SessionEnd` hook reviews each session and appends to it if something meets the bar. Use the `log-learning` skill to record something immediately instead of waiting for that sweep — necessary for anything decided in conversation that won't show up in a git diff.

## Claude Code skills

Repeatable workflows for this repo are captured as skills in `.claude/skills/` — invoke with `/<name>` or let them auto-trigger:

- `add-content` — adding a case study, principle, or blog post, including which e2e tests need updating
- `preflight` — the verification sequence below, with the conditional logic for which steps apply
- `conventional-commits` — commit/PR type+scope conventions
- `doc-sync` — checking whether README/CLAUDE.md need updating after a code change
- `self-review` — forking an independent subagent for a fresh-eyes review before declaring feature work done
- `log-learning` — recording something into LEARNINGS.md right now instead of waiting for the automatic session-end sweep

## What this is

Personal portfolio site for Philipp Storl — Astro v7, Tailwind v4, a couple of React islands, deployed on Netlify. Content (case studies, principles, blog posts) lives in `src/content/` as Markdown/MDX with zod-validated frontmatter.

## Stack facts that shape how to make changes

- **Astro-first, React only where needed.** The only React components are `src/components/ui/ContactForm.tsx` and `src/components/ui/ThemeToggle.tsx`. Everything else is `.astro`. Don't reach for React for new components unless there's real interactivity that needs it.
- **Tailwind v4 is CSS-first** — there is no `tailwind.config.js`. Theme tokens (fonts, colors, animations) live in the `@theme` block in `src/styles/global.css`. **Do not put infinite animation tokens in `@theme`** (e.g. `--animate-foo: foo 2s infinite`): Tailwind v4 auto-generates an unconditional `.animate-foo` utility class from every `--animate-*` token, which overrides any media-query-guarded manual class definition and silently breaks `prefers-reduced-motion` gating. Define infinite animations only as a `@keyframes` + `.animate-foo { animation: ... }` class, both inside the `@media (prefers-reduced-motion: no-preference)` block — no `@theme` token.
- **TypeScript strict mode** (`astro/tsconfigs/strict.json`), path alias `@/*` → `src/*` (see `tsconfig.json`).
- **Node 26** is pinned in both `netlify.toml` and CI — match it locally.

## Conventions to respect

- **Trailing slashes are mandatory** on every internal route (`trailingSlash: 'always'` in `astro.config.mjs`). Every `href`, `page.goto()`, and `toHaveURL()` must end in `/`. This is enforced in CI by `npm run check:trailing-slashes` (`scripts/check-trailing-slashes.js`) — run it locally after touching any route/link, since a missing slash fails the build job, not just lint.
- **Content collections** (`src/content.config.ts`) define three collections with different ordering rules — easy to mix up:
    - `work/` — order comes from a frontmatter `order` field (filenames become URL slugs, so they can't encode order). `coverImage` is optional (uses the `image()` schema helper, not a plain string) — the home page card falls back to its text-only layout when absent.
    - `principles/` — order comes from the filename prefix (`01-`, `02-`, …); there's no `order` field. Renaming a file reorders it.
    - `blog/` — posts default to `draft: true`; never flip to `false` unless asked to publish.
- **OG image generation** (`src/utils/og-image.ts`) intentionally uses `@fontsource/fraunces` (non-variable) alongside the variable font used by the site, because Satori can read WOFF/TTF/OTF but not WOFF2, and the variable font only ships WOFF2. Don't consolidate these to "simplify" — it'll break OG images.
- **A case study with a `coverImage` gets an inset screenshot panel on its OG image**, not just title/category text. Since `entry.data.coverImage` only exposes the Astro-optimized public URL (which isn't guaranteed to exist on disk yet during the same build pass that generates OG images), `src/pages/og/[...slug].png.ts` re-reads the raw frontmatter directly via `entry.filePath` to resolve the original source file, then crops it with Sharp to the same 16:10 ratio and top-anchored position as `WorkCard.astro`'s cover (a 1:1 crop looked broken rather than like a real preview) before embedding it in the Satori template. Don't try to wire this through `entry.data.coverImage`'s `src` — that's a build-order race.
- **Years-of-experience figures are computed in `src/utils/experience.ts`, never hardcoded as a number.** Two distinct figures, both used as digits ("16 years", not "Sixteen years") for readability:
    - `getYearsOfExperience()` — total career length, measured from a fixed start constant (`2010-02-01`) to `now`. Used in `src/data/hero.ts`, `src/data/about.ts`, `src/pages/principles.astro`, `src/pages/404.astro`. Like the footer's copyright year, this evaluates at build time (the site has no `output` override, so it's static) — it updates on the next deploy after each anniversary, not live in the browser.
    - `getStaffbaseTenureYears()` — the Staffbase-specific tenure, used in `src/data/hero.ts`'s `description`, `src/data/about.ts`'s first bio paragraph, and inline (via a body-level `import { getStaffbaseTenureYears } from '@/utils/experience'`, the same pattern `voices-conference-website.mdx` already uses for image imports) in the prose of `brand-evolution.mdx` and `storyblok-migration.mdx`. This one is computed between two **fixed** dates (start and last day, both already in the past), not against `now` — that tenure is over, so it must never grow past its true length in a later build.
    - The only places it's still a plain hardcoded `8` are case study **frontmatter** (`title`/`description` — these are validated as plain zod strings before any component renders, so they can't execute JS) and the plain-Markdown principles essays (`06-embrace-change.md`, `15-leave-it-better.md` — `.md` has no JSX support at all, unlike `.mdx`). If either constant date ever changes, grep for `8 years`/`eight years` across `src/content/` **and `e2e/work.spec.ts`** (which separately hardcodes the case study title for its own assertion) and update those literals by hand.
- **CSP lives in `netlify.toml`**, not just in markup. If you add any third-party script (analytics, embeds, etc.), update the `Content-Security-Policy` header there too — there's a `TODO` already marking where Plausible will go.
- **`netlify.toml` is formatted by `prettier-plugin-toml`**, with `indentEntries`/`indentTables`/`alignEntries` enabled in `.prettierrc.json` specifically to preserve its indentation and column-aligned `=` signs (the plugin's defaults flatten both). Run `npm run format` rather than hand-tuning spacing there.
- **Dark mode** is a manual `.dark` class on `<html>`, set by an inline pre-paint script in `src/layouts/BaseLayout.astro` and toggled by `ThemeToggle.tsx` via `localStorage`. Don't introduce a theming library for this.
- **View Transitions** (`<ClientRouter />` in `BaseLayout.astro`) swap page content client-side instead of doing a full reload. A `<script>` module's top-level code only runs once per browser session — so any interactive component that isn't `transition:persist`-ed (unlike `Header.astro`, which is) must wrap its setup in a function and register it on `document.addEventListener('astro:page-load', setup)`, or it silently stops working the second time a user soft-navigates to that page. See `ImageLightbox.astro` for the pattern; the bug it fixes is easy to miss because a hard page reload (or `page.goto()` in tests) always works fine.
- **Case study screenshots get a lightbox automatically.** Any `<Image>` inside a `<figure>` within a case study's MDX body is picked up by `ImageLightbox.astro` (mounted once in `CaseStudyLayout.astro`) — click/tap to enlarge, with gallery navigation across the whole article. No per-image markup or setup needed; don't reach for a library or React for this.
- **A `coverImage` taller than the home card's `aspect-[16/10]` container needs `position="top"` on the `<Image>` in `WorkCard.astro`, not a CSS `object-position` class.** When `<Image>` is given explicit `width`/`height` that don't match the source aspect ratio, Astro's image service (Sharp) crops server-side at generation time, before the browser ever sees it — so the served file is already exactly 640×400 and a CSS `object-cover`/`object-top` class on the `<img>` has nothing left to crop. Use the `<Image>` component's own `position` prop (maps to Sharp's crop anchor, same syntax as `object-position`) to control which part of a full-page screenshot survives the crop.
- **`WorkCard.astro` takes a `showCover` prop (default `true`) that `WorkSection.astro` sets to `false` only for the featured card.** It doesn't hide the cover outright — it adds `md:hidden` to the cover `<div>`, so the featured card's screenshot still shows on mobile but is suppressed on `md:`+ viewports, where the card spans all 3 grid columns and a full-width screenshot would otherwise dominate the row. The `<img>` is still present in the DOM either way (just CSS-hidden on desktop), so Playwright's `toHaveCount()` against it doesn't reflect visibility — use `toBeVisible()`/viewport-specific assertions instead if a test needs to distinguish the two cases.
- **Screenshot-heavy case studies get a sibling `<slug>.sources.txt`** next to the `.mdx` file (e.g. `brand-evolution.sources.txt`, `voices-conference-website.sources.txt`) — a plain-text provenance log mapping each screenshot to its source URL (Wayback Machine snapshot or live capture), exact capture date, and any correction history. It's not loaded by the site or referenced in code; it exists so a caption's date claim is traceable and so corrections (e.g. a mislabeled date) are documented rather than silently fixed. Add one when a case study's screenshots come from archived/external sources, and check it before trusting an existing screenshot's caption date.
- **A `<figcaption>` (or any JSX element) whose text content lands on its own line gets silently wrapped in a `<p>` by MDX's markdown processor** — text immediately adjacent to the opening tag is parsed as inline phrasing, but text separated by a newline is parsed as a block-level paragraph. Since Prettier breaks long lines onto their own line once they exceed its print width, this means a caption's rendered markup can flip between plain text and `<p>`-wrapped purely based on string length, with no explicit `<p>` anywhere in the source. Fix by wrapping the caption text in a JS string expression instead of plain JSX children, e.g. `<figcaption>{'March 2021 — Bananatag merger announcement'}</figcaption>` — a `{}` expression is parsed as JS, not markdown, so it's never subject to this rule regardless of how Prettier wraps it.
- **Multi-line `{/* */}` JSX comments in `.mdx` files get corrupted by Prettier's MDX printer** — it reformats the comment body as markdown and mangles the `*/` delimiters, which breaks the build. Keep MDX comments to one `{/* ... */}` per line instead of a single multi-line block; see the commented-out import block in `brand-evolution.mdx` for the pattern.
- **Color tokens** in `src/styles/global.css` (`--color-muted`, `--color-accent`, etc.) have been tuned to meet WCAG AA/AAA contrast against their usage context. Treat color value changes as accessibility-sensitive, not pure style edits — check contrast ratios before adjusting them.
- **Tailwind v4's preflight deliberately leaves `<button>` at the browser's native cursor (`default`), not `pointer`** — fixed globally via a `button:not(:disabled)`/`button:disabled` rule in `src/styles/global.css`, rather than adding `cursor-pointer` per component. New custom rules in that file that target elements which might also get a Tailwind utility class (cursor, color, etc.) should go inside `@layer base` so a future utility class still wins — Tailwind's layer order is `theme, base, components, utilities` (see `node_modules/tailwindcss/index.css`), and **unlayered** CSS always beats **any** layered utility regardless of specificity. The pre-existing unlayered rules above it (`:focus-visible`, `html:has(dialog[open])`) are fine left as-is since nothing competes with them on the same elements.
- **American English spelling** throughout — color not colour, organization not organisation, behavior not behaviour, prioritize not prioritise, etc. Applies to prose (content, README, comments) and extends to direct quotes attributed to other people, where spelling consistency takes priority over verbatim preservation. Doesn't apply to spec-defined identifiers that happen to contain similar substrings (e.g. `aria-labelledby`).
- **Quote style differs by file type.** Prettier uses single quotes everywhere except `*.css`, `*.md`, `*.mdx`, `*.yml`, and `*.yaml`, which stay double-quoted (see the `overrides` in `.prettierrc.json`) — so double-quoted frontmatter and CSS strings are intentional, not an inconsistency to "fix".

## Commands Claude should run

After any non-trivial change, in this order:

```bash
npm run format:check              # or `npm run format` to auto-fix
npm run lint
npm run typecheck
npm run check:trailing-slashes   # if routes/links/tests changed
npm run build
npm test                          # if components/pages/content changed
```

These mirror the CI jobs in `.github/workflows/ci.yml` (repository-hygiene, format, lint, typecheck, build, test) — if these pass locally, CI should pass.

For non-trivial feature, fix, or refactor work, follow these with the `self-review` skill before considering the change done. It forks an independent subagent with no memory of this conversation to review the diff — reviewing your own just-written code in the same context that wrote it tends to rubber-stamp it. Fix high-confidence bugs it reports directly; surface debatable or stylistic findings instead of changing them unasked. Re-run the relevant steps above if the fixes touched anything they cover.

This only closes the loop when _you_ invoke `self-review` mid-task and stay in the same turn to act on its findings. If a human runs `/self-review` directly as a standalone command, the findings are returned as plain output with nothing to automatically continue the loop — fixing them then requires an explicit follow-up turn.

## Testing

- E2E only, via Playwright, in `e2e/`. Tests run against the plain Astro dev server (`astro dev`, port 4321) — not `netlify dev` — started automatically by `playwright.config.ts`.
- Projects run on Desktop Chrome and Pixel 5; update the relevant `e2e/*.spec.ts` when changing routes, copy, or component structure it asserts on.
- `playwright.config.ts`'s `webServer.env` sets `ASTRO_DEV_BACKGROUND: '1'` — don't remove it. Astro 7 auto-detects agentic CLI environments (e.g. Claude Code, via the `CLAUDECODE` env var) and silently daemonizes `astro dev` in the background instead of blocking in the foreground. Without this override, Playwright loses ownership of that process: the orphaned daemon survives past the test run, and a later `npm run build` can overwrite its shared Vite dependency cache out from under it, breaking React island hydration (`_jsxDEV is not a function`) for every test run that reuses it. See the comment at `playwright.config.ts:37` for the full mechanism.

## Git conventions

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). Format: `type(scope): description`.

- **Type** is required — `feat` and `fix` are the common ones, but any type is fine when it fits better (`docs`, `chore`, `refactor`, `test`, `ci`, `style`, `perf`, …). History so far uses `feat:`, `fix:`, `chore(deps):`, `chore(deps-dev):`, `chore(ci):`.
- **Scope** is optional — a noun in parentheses naming the area touched, e.g. `feat(ci):`, `chore(deps):`. Omit it when the change isn't scoped to one area.
- Dependabot (`.github/dependabot.yml`) handles weekly npm bumps — don't manually bump a dependency version it would otherwise cover.

## Don't

- Don't add a `tailwind.config.js` — config is CSS-first in `global.css`.
- Don't edit `dist/`, `.astro/`, or `.netlify/` — generated/local, gitignored.
- Don't loosen security headers or the CSP in `netlify.toml` without being explicitly asked.
