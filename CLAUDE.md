# CLAUDE.md

Guidance for Claude Code when working in this repository. For setup, the full npm scripts table, and content-editing walkthroughs, see [README.md](README.md) — this file covers conventions and gotchas that aren't obvious from a first read.

## What this is

Personal portfolio site for Philipp Storl — Astro v6, Tailwind v4, a couple of React islands, deployed on Netlify. Content (case studies, principles, blog posts) lives in `src/content/` as Markdown/MDX with zod-validated frontmatter.

## Stack facts that shape how to make changes

- **Astro-first, React only where needed.** The only React components are `src/components/ui/ContactForm.tsx` and `src/components/ui/ThemeToggle.tsx`. Everything else is `.astro`. Don't reach for React for new components unless there's real interactivity that needs it.
- **Tailwind v4 is CSS-first** — there is no `tailwind.config.js`. Theme tokens (fonts, colors, animations) live in the `@theme` block in `src/styles/global.css`.
- **TypeScript strict mode** (`astro/tsconfigs/strict.json`), path alias `@/*` → `src/*` (see `tsconfig.json`).
- **Node 26** is pinned in both `netlify.toml` and CI — match it locally.

## Conventions to respect

- **Trailing slashes are mandatory** on every internal route (`trailingSlash: 'always'` in `astro.config.mjs`). Every `href`, `page.goto()`, and `toHaveURL()` must end in `/`. This is enforced in CI by `npm run check:trailing-slashes` (`scripts/check-trailing-slashes.js`) — run it locally after touching any route/link, since a missing slash fails the build job, not just lint.
- **Content collections** (`src/content.config.ts`) define three collections with different ordering rules — easy to mix up:
    - `work/` — order comes from a frontmatter `order` field (filenames become URL slugs, so they can't encode order). `coverImage` is optional (uses the `image()` schema helper, not a plain string) — only one case study has it today; the home page card falls back to its text-only layout when absent.
    - `principles/` — order comes from the filename prefix (`01-`, `02-`, …); there's no `order` field. Renaming a file reorders it.
    - `blog/` — posts default to `draft: true`; never flip to `false` unless asked to publish.
- **OG image generation** (`src/utils/og-image.ts`) intentionally uses `@fontsource/fraunces` (non-variable) alongside the variable font used by the site, because Satori can read WOFF/TTF/OTF but not WOFF2, and the variable font only ships WOFF2. Don't consolidate these to "simplify" — it'll break OG images.
- **CSP lives in `netlify.toml`**, not just in markup. If you add any third-party script (analytics, embeds, etc.), update the `Content-Security-Policy` header there too — there's a `TODO` already marking where Plausible will go.
- **Dark mode** is a manual `.dark` class on `<html>`, set by an inline pre-paint script in `src/layouts/BaseLayout.astro` and toggled by `ThemeToggle.tsx` via `localStorage`. Don't introduce a theming library for this.
- **View Transitions** (`<ClientRouter />` in `BaseLayout.astro`) swap page content client-side instead of doing a full reload. A `<script>` module's top-level code only runs once per browser session — so any interactive component that isn't `transition:persist`-ed (unlike `Header.astro`, which is) must wrap its setup in a function and register it on `document.addEventListener('astro:page-load', setup)`, or it silently stops working the second time a user soft-navigates to that page. See `ImageLightbox.astro` for the pattern; the bug it fixes is easy to miss because a hard page reload (or `page.goto()` in tests) always works fine.
- **Case study screenshots get a lightbox automatically.** Any `<Image>` inside a `<figure>` within a case study's MDX body is picked up by `ImageLightbox.astro` (mounted once in `CaseStudyLayout.astro`) — click/tap to enlarge, with gallery navigation across the whole article. No per-image markup or setup needed; don't reach for a library or React for this.
- **Color tokens** in `src/styles/global.css` carry inline comments recording WCAG contrast ratios (e.g. "improved to AAA on bg"). Treat color value changes as accessibility-sensitive, not pure style edits.
- **American English spelling** throughout — color not colour, organization not organisation, behavior not behaviour, prioritize not prioritise, etc. Applies to prose (content, README, comments) and extends to direct quotes attributed to other people, where spelling consistency takes priority over verbatim preservation. Doesn't apply to spec-defined identifiers that happen to contain similar substrings (e.g. `aria-labelledby`).

## Commands Claude should run

After any non-trivial change, in this order:

```
npm run format:check              # or `npm run format` to auto-fix
npm run lint
npm run typecheck
npm run check:trailing-slashes   # if routes/links/tests changed
npm run build
npm test                          # if components/pages/content changed
```

These mirror the CI jobs in `.github/workflows/ci.yml` (repository-hygiene, format, lint, typecheck, build, test) — if these pass locally, CI should pass.

## Testing

- E2E only, via Playwright, in `e2e/`. Tests run against the plain Astro dev server (`astro dev`, port 4321) — not `netlify dev` — started automatically by `playwright.config.ts`.
- Projects run on Desktop Chrome and Pixel 5; update the relevant `e2e/*.spec.ts` when changing routes, copy, or component structure it asserts on.

## Git conventions

This repo follows [Conventional Commits](https://www.conventionalcommits.org/). Format: `type(scope): description`.

- **Type** is required — `feat` and `fix` are the common ones, but any type is fine when it fits better (`docs`, `chore`, `refactor`, `test`, `ci`, `style`, `perf`, …). History so far uses `feat:`, `fix:`, `chore(deps):`, `chore(deps-dev):`, `chore(ci):`.
- **Scope** is optional — a noun in parentheses naming the area touched, e.g. `feat(ci):`, `chore(deps):`. Omit it when the change isn't scoped to one area.
- Dependabot (`.github/dependabot.yml`) handles weekly npm bumps — don't manually bump a dependency version it would otherwise cover.

## Don't

- Don't add a `tailwind.config.js` — config is CSS-first in `global.css`.
- Don't edit `dist/`, `.astro/`, or `.netlify/` — generated/local, gitignored.
- Don't loosen security headers or the CSP in `netlify.toml` without being explicitly asked.
