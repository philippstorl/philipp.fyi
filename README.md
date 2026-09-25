# philipp.fyi

[![Netlify Status](https://api.netlify.com/api/v1/badges/298b597c-afe1-458b-9c18-b261be8eef05/deploy-status)](https://app.netlify.com/projects/philipp-storl/deploys)
[![CI](https://github.com/philippstorl/philipp.fyi/actions/workflows/ci.yml/badge.svg)](https://github.com/philippstorl/philipp.fyi/actions/workflows/ci.yml)

Personal portfolio site for Philipp Storl — built with Astro v7, Tailwind CSS v4, React, and deployed on Netlify.

## Prerequisites

- **Node.js 26** — matches the version set in `netlify.toml` and pinned in `.nvmrc`/`package.json`'s `engines` field (Current release, enters LTS October 2026). Run `nvm use` to switch automatically if you use nvm. This is enforced, not just a suggestion: the committed `.npmrc` sets `engine-strict=true`, so `npm install` hard-fails with `EBADENGINE` on any other Node version. It also sets `strict-allow-scripts=true`: a dependency's install script only runs if `package.json`'s `allowScripts` approves it, and adding a package whose script isn't listed there fails the install (see CLAUDE.md for how to approve one).
- **Netlify CLI** — installed as a devDependency, used for local development

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers (one-time)
npx playwright install chromium

# 3. Link to your Netlify site (one-time, run from project root)
npx netlify link

# 4. Start local dev server with Netlify runtime
npm run dev
```

`netlify dev` proxies the Astro dev server through Netlify's local runtime, which means the contact form, redirects, and security headers all behave as they will in production. The site is available at `http://localhost:8888`.

If you need the pure Astro dev server without Netlify features:

```bash
npm run dev:astro  # http://localhost:4321
```

## Scripts

| Command                               | What it does                                                               |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                         | Start dev server via Netlify CLI (recommended)                             |
| `npm run dev:astro`                   | Start Astro dev server directly                                            |
| `npm run build`                       | Type-check + build to `dist/`                                              |
| `npm run build:app`                   | Build to `dist/` without the type-check prefix (used by CI)                |
| `npm run typecheck`                   | Run `astro check` (TypeScript only)                                        |
| `npm run lint`                        | Run ESLint (TypeScript, Astro, accessibility)                              |
| `npm run check:trailing-slashes`      | Validate every internal link/route ends in `/`                             |
| `npm run check:favicons`              | Fail if the favicons changed since `generate:favicons` last ran            |
| `npm run check:color-copies`          | Check hex copies of `global.css` color tokens still match them             |
| `npm run check:font-preloads`         | Check every font preload in `dist/` matches a built `@font-face` URL       |
| `npm run check:inline-module-scripts` | Fail if any `<script type="module">` in `dist/` has no `src`               |
| `npm run check:page-coverage`         | Fail if `scripts/contrast-pages.mjs` and the pages built in `dist/` differ |
| `npm run check:csp`                   | Fail if `dist/` has inline code or a `style` attribute the meta CSP blocks |
| `npm run check:learnings`             | Run the SessionStart hook's LEARNINGS.md loader and check its output       |
| `npm run check:audit`                 | Audit production dependencies for high-severity vulnerabilities            |
| `npm run format`                      | Format all files with Prettier                                             |
| `npm run format:check`                | Check formatting without writing (used in CI)                              |
| `npm run preview`                     | Preview the production build locally                                       |
| `npm test`                            | Run Playwright E2E tests                                                   |
| `npm run test:ui`                     | Run Playwright tests in interactive UI mode                                |
| `npm run test:contrast`               | Run the report-only color-contrast scan (not part of `npm test`)           |
| `npm run test:functions`              | Run the Netlify Functions unit tests (`tests/functions/`, no browser)      |
| `npm run check:contrast`              | Aggregate `test:contrast`'s output against the allowlist                   |
| `npm run generate:favicons`           | Regenerate `favicon.ico`/`apple-touch-icon.png` from `favicon.svg`         |

The `build` script runs `astro check` before `astro build` — TypeScript errors will fail the build on Netlify before anything reaches the CDN.

## CI (GitHub Actions)

Every pull request, and every push to `main`, runs the workflow in `.github/workflows/ci.yml`. It can also be triggered manually (`workflow_dispatch`). Runs are canceled and restarted if you push again to the same branch before the previous run finishes.

Nine jobs run in parallel, all on Node 26:

| Job                  | What it does                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository-hygiene` | Fails if generated or sensitive paths (`node_modules`, `dist`, `.astro`, `.env*`, etc.) are accidentally tracked in git, then runs `npm run check:learnings` (plain Node, no `npm ci`)                                                                                                                                                        |
| `lint`               | `npm run lint`                                                                                                                                                                                                                                                                                                                                |
| `format`             | `npm run format:check`                                                                                                                                                                                                                                                                                                                        |
| `typecheck`          | `npm run typecheck`                                                                                                                                                                                                                                                                                                                           |
| `audit`              | `npm run check:audit` — production dependencies only, see CLAUDE.md for why                                                                                                                                                                                                                                                                   |
| `build`              | `npm run check:trailing-slashes`, `npm run check:favicons` and `npm run check:color-copies`, then `npm run build:app`, then `npm run check:font-preloads`, `npm run check:inline-module-scripts`, `npm run check:page-coverage` and `npm run check:csp` (skips the `astro check` prefix — the `typecheck` job already covers that)            |
| `test`               | `npm run check:trailing-slashes`, installs Chromium, then `npm test`; uploads the Playwright report as a build artifact (30-day retention) regardless of pass/fail                                                                                                                                                                            |
| `functions`          | `npm run test:functions`: unit tests for `netlify/functions/` (signature verification, CSP-report and deploy-notification handlers, Slack escaping), plain Node with no browser or dev server                                                                                                                                                 |
| `contrast`           | Report-only: runs `npm run test:contrast` + `npm run check:contrast`, then posts (or updates) a single PR comment listing any new color-contrast violations, or nodes axe could not check, not already in `contrast-allowlist.json`. PR-only — doesn't run on push to `main` — and never fails the build over a site violation; see CLAUDE.md |

Dependabot (`.github/dependabot.yml`) opens npm dependency and GitHub Actions PRs weekly, capped at 5 open at a time per ecosystem, labeled `dependencies` and titled `chore(deps)`/`chore(deps-dev)`. Every Actions step in `ci.yml` is pinned to a commit SHA with a version comment (see CLAUDE.md) — Dependabot bumps both together.

## Deployment

Netlify builds automatically from the `main` branch. Configuration lives almost entirely in `netlify.toml` — the dashboard-only settings are `SLACK_WEBHOOK_URL` (see [CSP violation reporting](#csp-violation-reporting) below) and `SLACK_DEPLOY_WEBHOOK_URL`/`DEPLOY_NOTIFICATION_WEBHOOK_SECRET` (see [Deploy notifications](#deploy-notifications) below), none of which can be committed.

Check what's deployed at any time: `https://philipp.fyi/build.txt`

## CSP violation reporting

`netlify/functions/csp-report.ts` receives the browser's CSP violation reports (wired up via `netlify.toml`'s `report-to`/`report-uri` directives — see [`netlify/functions/CLAUDE.md`](netlify/functions/CLAUDE.md) for the full mechanism), logs each one to a `csp-reports` Netlify Blobs store, and posts a summary plus the stored report (user agent included, JSON shortened if very long) to Slack, which `/privacy/` discloses as a recipient.

Setup (one-time):

1. In a Slack workspace, add an "Incoming Webhooks" app and create a webhook for the channel that should get violation alerts.
2. In the Netlify dashboard for this site, add an environment variable named `SLACK_WEBHOOK_URL` with that webhook's URL. Never commit it to `netlify.toml` or anywhere else in the repo.

If `SLACK_WEBHOOK_URL` isn't set (e.g. local dev), the function still writes to Blobs, it just skips the Slack post silently.

Unlike deploy notifications below, this endpoint has no signature check: it's hit directly by browsers via the CSP `report-to`/`report-uri` directives, not by a Netlify Outgoing Webhook, so there's no Netlify-signed `X-Webhook-Signature` to verify — it's unauthenticated by design, the same as any CSP reporting endpoint.

Review stored reports without a dashboard:

```bash
npx netlify blobs:list csp-reports
npx netlify blobs:get csp-reports <key>
```

## CSP report retention

`netlify/functions/csp-report-cleanup.ts` runs daily on a Netlify scheduled function (a `config` export with a cron `schedule`, not a dashboard/`netlify.toml` setting) and deletes any `csp-reports` Blobs entry older than 30 days — the Blobs SDK has no TTL/expiration option, so nothing else prunes the store. No setup needed; it runs automatically once deployed. See [`netlify/functions/CLAUDE.md`](netlify/functions/CLAUDE.md)'s `csp-report-cleanup.ts` bullet for how it works and what it's verified against.

## Deploy notifications

Netlify's native Slack notification type is gated behind Pro/Enterprise, and its generic Outgoing Webhook posts a raw deploy-object JSON that Slack's Incoming Webhook endpoint rejects (`400 no_text`) since it isn't shaped for Slack. `netlify/functions/deploy-notification.ts` receives that raw Outgoing Webhook POST, reformats it into a Slack-compatible message (✅ succeeded / ❌ failed, with the branch, context, and a link to the deploy or the error message), and forwards it to a Slack Incoming Webhook. It's a separate function and a separate Slack channel from CSP violation reporting above, on purpose.

Setup (one-time):

1. In a Slack workspace, add an "Incoming Webhooks" app and create a webhook for the channel that should get deploy alerts.
2. In the Netlify dashboard for this site, add an environment variable named `SLACK_DEPLOY_WEBHOOK_URL` with that webhook's URL. Never commit it to `netlify.toml` or anywhere else in the repo.
3. Generate a random secret (e.g. `openssl rand -hex 32`) and add it as an environment variable named `DEPLOY_NOTIFICATION_WEBHOOK_SECRET`.
4. In the Netlify dashboard, Site settings → Notifications → Deploy notifications, point the "Deploy succeeded" and "Deploy failed" Outgoing Webhook notifications at `https://philipp.fyi/.netlify/functions/deploy-notification` instead of a raw `hooks.slack.com` URL. Each of these is a separate notification config — paste the same secret from step 3 into **both** notifications' JWS secret field, not just one, or the one left unsigned will 401 forever.

If `SLACK_DEPLOY_WEBHOOK_URL` isn't set (e.g. local dev without a `.env` entry for it), the function silently skips the Slack post.

`DEPLOY_NOTIFICATION_WEBHOOK_SECRET` is required, not optional: the function verifies Netlify's `X-Webhook-Signature` JWS against it and fails closed with `401` (logging an error) if the secret isn't configured or the signature doesn't check out — without it, the endpoint's URL being public (documented right here) would let anyone POST a crafted deploy payload and get an attacker-controlled message relayed into Slack. If steps 3 and 4 haven't both been done yet on a fresh setup, deploy notifications will 401 rather than post — configure the secret in both places together.

## Testing (Playwright)

E2E tests live in `e2e/` and run against the Astro dev server, which Playwright starts automatically.

```bash
# Run all tests (headless)
npm test

# Interactive UI — watch tests run in the browser
npm run test:ui

# Run a specific file
npx playwright test e2e/work.spec.ts

# Debug a single test
npx playwright test e2e/home.spec.ts --debug
```

### Test coverage

| File                                  | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/home.spec.ts`                    | Title, headline, 4 work cards, "See all work" CTA to /work, 6 principle cards, 6 recommendation cards, contact teaser section, og:type is website, share-image alt text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `e2e/navigation.spec.ts`              | Header, nav links (Work, About, Principles, Contact), name mark, skip-to-main-content link, theme toggle (no React chunk, live OS-preference tracking on "system", persists across client-side navigation, no duplicate accessible description, an unknown stored value falls back to "system", pressed styling follows `aria-pressed`), mobile nav closes on Escape (mobile only), on click outside and on a browser-Back swap, the backdrop appears/disappears with the menu, background content (skip link, `#main-content`, `#site-footer`) goes `inert` while the mobile nav is open, also after a client-side swap, reverse-Tab focus is never hidden under the sticky header, mobile nav scrolls at 320 × 256, 320px logo clears the toggle, active link and pressed theme button visible in forced colors, a scrolled page stays put as the nav opens/closes or Tab enters the header, with JS off, all section links show on phones and desktop hides the toggle |
| `e2e/work.spec.ts`                    | All 4 case study pages render, card links resolve correctly, homepage cards stay lazy-loaded, og:type is article with article:published_time, share-image alt text is the case study title, a screenshot reused across grids shares one srcset, full-width figures offer a 1080w candidate; Work index page heading/cards, no skipped heading levels between the h1 and the card titles, eager/priority loading on the featured + first non-featured covers, interlinks to About/Principles/Recommendations                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `e2e/lightbox.spec.ts`                | Case study image lightbox — open/close, gallery navigation, client-side navigation persistence, enlarged image uses a full-resolution source distinct from the downscaled inline one, only the current slide is exposed to the accessibility tree, axe scan of the open dialog, arrow keys on the focused track don't double-scroll, a quick Next right after opening never jumps the counter back a slide                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `e2e/principles.spec.ts`              | 15 principles shown, numbered 01–15, meta description count matches, German quotes marked `lang="de"`, CTA links to /principles, interlinks to /about, /work, and /recommendations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `e2e/recommendations.spec.ts`         | 14 recommendations shown, CTA links to /recommendations, interlinks to /about, /principles, and /work, interlink-card accessible names separated as "eyebrow: label" on all four pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `e2e/about.spec.ts`                   | About page heading/bio/facts, tech stack section, CTA links to /about, interlinks to /work, /principles, and /recommendations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `e2e/404.spec.ts`                     | 404 status on unknown routes, correct headline, back home link                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `e2e/contact.spec.ts`                 | Contact page heading/form, LinkedIn/GitHub links, "Send me a message" CTA on home links to /contact, footer mail icon links to /contact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `e2e/contact-form.spec.ts`            | Contact form validation errors + focus, invalid-email message, per-field errors clear on correction without stealing focus or clearing a still-invalid email, single summary alert (not one per field) on multi-field failure, summary re-announces on a same-count retry, error-focused field scrolled clear of the sticky header, mocked failed submission (error banner; keyboard focus stays on the submit button and no duplicate POST while sending; a later invalid submit clears the banner), mocked successful submission (confirmation + focus; the urlencoded POST body carries `form-name`, an empty honeypot and only the hidden static form's fields)                                                                                                                                                                                                                                                                                                       |
| `e2e/blog.spec.ts`                    | Title/meta description, the "Writing coming soon." empty state (all posts are currently `draft: true`), noindex/sitemap exclusion/no RSS autodiscovery while empty, the feed's `/blog/` channel link, header/footer chrome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `e2e/privacy.spec.ts`                 | Privacy Policy page heading/GDPR sections, disclosures matching what the site actually processes (RUM per-page-view records with a § 25 TDDDG statement, the CSP report going to Slack with its transfer and retention, Art. 6(1)(f) contact-form basis with the Art. 21 right to object, voluntariness, log retention, Netlify Forms metadata and Akismet), links to /contact, footer "Privacy" link leads to /privacy, external links (Netlify, Netlify's RUM docs, Automattic, Slack, the Saxon DPA) carry the correct href plus a new-tab accessible-name suffix, prose links stay underlined at rest (WCAG 1.4.1), stays noindexed with a real canonical link                                                                                                                                                                                                                                                                                                        |
| `e2e/meta-description-length.spec.ts` | Every page's `<meta name="description">` stays within Google's ~155-char SERP snippet length                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `e2e/robots-txt.spec.ts`              | `robots.txt` lets Twitterbot and LinkedInBot fetch every page's `og:image`/`twitter:image` (Desktop Chrome only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `e2e/security-txt.spec.ts`            | `/.well-known/security.txt` serves RFC 9116 `Contact`/`Policy`/`Canonical` fields and an `Expires` date in the future but under a year out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `e2e/favicons.spec.ts`                | `rel="apple-touch-icon"` link, `/apple-touch-icon.png` served as a 180×180 full-bleed PNG (uniform border, no baked-in rounded corners), `/favicon.ico` served as a real ICO (not the 404 page)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `e2e/reduced-motion.spec.ts`          | `prefers-reduced-motion` gating, checked under both `reduce` and `no-preference`: every `.animate-*` animation on the homepage (mobile nav open) and `html` `scroll-behavior`, plus the lightbox's prev/next and the contact form's error-focus JS scrolls, including a mid-session preference change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Tests run on Desktop Chrome and Pixel 5 (mobile). On CI, workers are set to 1 with a single retry.

Shared test helpers live in `e2e/helpers/` (not matched as specs). Any test that submits the contact form calls `gotoAndWaitForContactFormHydration(page)` from `e2e/helpers/contact-form.ts` first: a click before React hydrates the island falls through to a native form POST.

`e2e/blog.spec.ts` only covers `/blog/`'s current empty state, not `/blog/[slug]/` post content — there's no published post to test against yet. Add slug-page coverage once a post ships (see the `add-content` skill).

`e2e/contrast.spec.ts` is not part of this table or `npm test` — it's a report-only color-contrast scan (light and dark, Desktop Chrome only) run separately via `npm run test:contrast` / `playwright.contrast.config.ts`, aggregated by `npm run check:contrast` against `contrast-allowlist.json`. See the `contrast` CI job above and CLAUDE.md for how it's wired up.

### Netlify Functions unit tests

`astro dev` doesn't serve Netlify Functions, so `tests/functions/` unit-tests them directly: `npm run test:functions` (`playwright.functions.config.ts`, plain Node, no browser, about a second) imports each handler, calls it with a real `Request`, and stubs `fetch` so nothing reaches the network, the real Slack webhooks, or Netlify Blobs. It covers `X-Webhook-Signature` verification (valid, wrong secret, tampered body, missing/stripped/truncated token, wrong `alg`/`iss`), the `deploy-notification` 401/400/204 paths, `csp-report`'s 405/413/400 paths, report normalization, batch cap and non-string-field handling, Slack escaping of attacker-controlled fields in both handlers, `csp-report-cleanup`'s retention, and the `includeSubDomains` HSTS header on both HTTP functions' responses (matched against `netlify.toml`). It runs as the `functions` CI job, not as part of `npm test`.

### First run

Playwright needs browsers installed before tests can run:

```bash
npx playwright install chromium
```

## Content editing

All content lives in `src/content/`. No code changes needed for most edits.

### Case studies — `src/content/work/`

Each `.mdx` file is a case study. Frontmatter fields:

```yaml
title: "Your title"
description: "One sentence shown on the work card." # also the meta description; keep it ≤155 chars
category: "Engineering" # or "Design" or "Leadership"
tags: ["Tag One", "Tag Two"] # at least 1 required
year: "2024–2025" # a single 4-digit year ("2024") or an en-dash range like this one
order: 1 # controls display order — non-negative integers, 1 = first (the lowest gets the wide card)
draft: false # true = hidden from the site
coverImage: "./your-screenshot.png" # optional — teaser shown on the home page card
```

Screenshots in the case study body go through [`ResponsiveFigure`](src/components/ui/ResponsiveFigure.astro) (`<ResponsiveFigure src={img} alt="..." caption="..." {...responsiveGridFigureSizing(THREE_COLUMN_RESPONSIVE_TIERS)} />` for a grid whose column count changes at breakpoints, `{...fullWidthFigureSizing()}` for a standalone full-width figure — see [`content-image-sizing.ts`](src/utils/content-image-sizing.ts) for the full set of sizing helpers) rather than a hand-written `<figure><Image/><figcaption/></figure>` block, and automatically get a click-to-enlarge lightbox with a full-resolution source — no extra markup or setup needed, see [`ImageLightbox.astro`](src/components/work/ImageLightbox.astro).

A new published case study also needs an entry in [`scripts/contrast-pages.mjs`](scripts/contrast-pages.mjs), the page list behind the contrast scan and the meta-description length test. `npm run check:page-coverage` fails the CI `build` job until it has one.

### Principles — `src/content/principles/`

Fifteen `.md` files named `01-title.md` through `15-title.md`. The filename prefix controls sort order — rename a file to reorder it. No `order` field in frontmatter.

```yaml
title: "Principle title"
description: "One or two sentences shown on the home page card."
```

### Blog posts — `src/content/blog/`

All posts start as `draft: true` and are hidden from the site. To publish:

```yaml
title: "Post title"
description: "Short description."
date: 2026-01-15
draft: false
tags: ["tag"] # at least 1 required
```

Create the file as `src/content/blog/your-post-slug.md`. Publishing (flipping `draft` to `false`) also gets the post a per-slug OG image automatically — see [OG images](#og-images) below.

Published posts (`draft: false`) also appear automatically in the RSS feed at `/rss.xml` (`src/pages/rss.xml.ts`) — no separate step needed. The feed is empty while every post is still a draft. Until the first post is published, `/blog/` is also `noindex`, left out of the sitemap, and no page advertises the feed; publishing flips all three automatically. Unlike the feed, `scripts/contrast-pages.mjs` does need a `/blog/<slug>/` entry for each published post, same as a case study.

## OG images

OG images are generated at build time using Satori + Sharp. Satori accepts TTF, OTF, and WOFF — but not WOFF2. Because `@fontsource-variable/geist` only ships WOFF2, the project uses `@fontsource/geist` (non-variable) specifically for OG image generation, loaded at both 400 (regular) and 700 (bold) weight to match the site's own regular body text and bold headings. The website itself still uses the variable font via `@fontsource-variable/geist`.

Both weights are loaded from `node_modules/@fontsource/geist/files/*.woff` at build time. If OG image generation fails, the error message includes a directory listing to help verify the exact filename against the matcher in `src/utils/og-image.ts`.

Every static page, case study, and published blog post gets its own `/og/<slug>.png` — see `src/pages/og/[...slug].png.ts`'s `getStaticPaths`. Static pages' titles and card labels live in `src/data/static-pages.ts`, which also supplies each page's `<title>` and `ogImage` via `staticPageMeta()`. This includes the `/blog/` listing page itself (`/og/blog.png`), which exists regardless of whether any posts are published. Since every blog post currently ships as `draft: true`, no per-post `/og/blog/<slug>.png` images exist yet; that wiring is in place and generates automatically the moment a post is published.

## Structured data (JSON-LD)

The homepage renders a `Person` schema (name, job title, and `sameAs` links to LinkedIn/GitHub) and each case study renders a `CreativeWork` schema (title, description, publish year, author, URL, and image), both as `<script type="application/ld+json">` tags — see `src/utils/schema.ts` for the data and `src/components/seo/JsonLd.astro` for the shared rendering. This needs no CSP changes: `type="application/ld+json"` scripts aren't subject to the `script-src` directive at all (see CLAUDE.md's CSP section for how this was verified against a real build).

## Analytics

Site analytics come from **Netlify Analytics** (Netlify dashboard → Logs & metrics → Analytics, issue #60). It's server-side, built from Netlify's request logs, so there's no script, no cookie, and nothing to change in this repo's CSP. It's disclosed on `/privacy/`.

## Key paths

```text
src/
  components/
    home/          → Hero, WorkSection, AboutSection, PrinciplesSection, PrincipleCard, RecommendationsSection, RecommendationCard, ContactSection, SectionHeader
    layout/        → Header, NavLink, Footer, Main
    seo/           → JsonLd (renders Person/CreativeWork JSON-LD, see src/utils/schema.ts)
    ui/            → ThemeToggle, ContactForm, SocialIcon, CategoryBadge, InitialsAvatar, InterlinkCard, InterlinkRow, PageHeader, NewTabIndicator, ResponsiveImage, ResponsiveFigure
    work/          → CaseStudyLayout, ImageLightbox, WorkCard, WorkGrid
  content/
    work/          → Case study MDX files (4 entries)
    principles/    → Principle MD files (15 entries)
    blog/          → Blog post MD files (all draft by default)
  data/
    about.ts            → About page/section copy and facts
    hero.ts             → Hero section copy
    navigation.ts       → Nav items
    social.ts           → LinkedIn, GitHub, Contact links
    recommendations.ts  → LinkedIn recommendations (14 entries, 6 featured on the home page)
    stack.ts            → This site's own tech stack, shown on the About page
    site.ts             → Site name/default description, shared by BaseLayout.astro and rss.xml.ts
    static-pages.ts     → Static pages' title + OG card label, feeding <title>, ogImage (staticPageMeta) and OG cards
  layouts/
    BaseLayout.astro
  pages/
    index.astro
    about.astro
    contact.astro
    privacy.astro
    principles.astro
    recommendations.astro
    work/index.astro
    work/[slug].astro
    blog/index.astro
    blog/[slug].astro
    404.astro
    build.txt.ts
    rss.xml.ts
    .well-known/security.txt.ts
    og/[...slug].png.ts
  styles/
    global.css     → Tailwind v4 config, design tokens, dark mode
  utils/
    og-image.ts        → Satori template + Sharp PNG generation
    schema.ts          → Person/CreativeWork JSON-LD schema builders, rendered by components/seo/JsonLd.astro
    experience.ts      → Computes career-length and Staffbase-tenure year figures from fixed dates
    category-colors.ts → Shared category → badge-color mapping (Tailwind classes + Satori hex equivalents)
    nav-active.ts      → Shared active-nav-link match + class vocabulary, used by NavLink.astro and Header.astro's client script
    blog-posts.ts      → getPublishedBlogPosts(), the shared draft-filter + sort used by every blog page/route
    collections.ts     → getPublishedEntries(collection), the shared draft-filter behind work and blog
    sitemap.ts         → sitemapWithoutNoindexPages(), the sitemap integration minus every page whose built HTML is noindex
    url.ts             → toAbsoluteUrl(path, site), the shared canonical/OG/JSON-LD absolute-URL builder
    slug.ts            → stripContentExtension(id), the shared content-entry id → URL slug helper
    date.ts            → formatBlogDate(date), the shared UTC blog-date formatter
    prose.ts           → PROSE_CONTENT_CLASSES, the shared prose wrapper classes for case studies, blog posts and /privacy/
    a11y.ts            → NEW_TAB_SUFFIX, the shared "(opens in a new tab)" wording used by NewTabIndicator.astro and Footer.astro
    content-image-sizing.ts → sizes/widths helpers for ResponsiveFigure/ResponsiveImage call sites in case-study (and future blog) MDX bodies
e2e/               → Playwright E2E tests
  helpers/
    contact-form.ts → gotoAndWaitForContactFormHydration(page) + CONTACT_SUBMIT_SELECTOR, shared by every contact-form test
tests/functions/   → Netlify Functions unit tests (npm run test:functions)
public/
  favicon.svg
  favicon.ico          → generated from favicon.svg (npm run generate:favicons)
  apple-touch-icon.png → generated from favicon.svg (npm run generate:favicons)
  robots.txt
netlify/
  functions/
    _shared/
      slack.ts             → Shared postToSlack() + Slack mrkdwn sanitization (sanitizeSlackText/truncateForSlack) used by both functions below
      verify-netlify-signature.ts → Verifies Netlify's X-Webhook-Signature JWS for deploy-notification.ts
    CLAUDE.md              → Directory-scoped Claude Code guidance, loaded only when working under netlify/functions/
    csp-report.ts          → Receives CSP violation reports, logs to Netlify Blobs, posts to Slack
    csp-report-cleanup.ts  → Scheduled function; deletes csp-reports Blobs entries older than 30 days
    deploy-notification.ts → Reformats Netlify's raw deploy webhook into a Slack message, posts to Slack
netlify.toml       → Build, Node version, security headers, cache headers, 404 redirect, CSP reporting headers
playwright.config.ts
playwright.functions.config.ts → Browserless Playwright config for tests/functions/
```

## Security

To report a vulnerability, use GitHub's private vulnerability reporting rather than a public issue; see [SECURITY.md](SECURITY.md). The live site also serves an RFC 9116 [`/.well-known/security.txt`](https://philipp.fyi/.well-known/security.txt) pointing to the same channel.

## License

All rights reserved. This is a personal portfolio repository, not open source; see [LICENSE](LICENSE).
