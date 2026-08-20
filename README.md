# philipp.fyi

[![Netlify Status](https://api.netlify.com/api/v1/badges/298b597c-afe1-458b-9c18-b261be8eef05/deploy-status)](https://app.netlify.com/projects/philipp-storl/deploys)
[![CI](https://github.com/philippstorl/philipp.fyi/actions/workflows/ci.yml/badge.svg)](https://github.com/philippstorl/philipp.fyi/actions/workflows/ci.yml)

Personal portfolio site for Philipp Storl — built with Astro v7, Tailwind CSS v4, React, and deployed on Netlify.

## Prerequisites

- **Node.js 26** — matches the version set in `netlify.toml` and pinned in `.nvmrc`/`package.json`'s `engines` field (Current release, enters LTS October 2026). Run `nvm use` to switch automatically if you use nvm.
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

| Command                          | What it does                                                     |
| -------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                    | Start dev server via Netlify CLI (recommended)                   |
| `npm run dev:astro`              | Start Astro dev server directly                                  |
| `npm run build`                  | Type-check + build to `dist/`                                    |
| `npm run build:app`              | Build to `dist/` without the type-check prefix (used by CI)      |
| `npm run typecheck`              | Run `astro check` (TypeScript only)                              |
| `npm run lint`                   | Run ESLint (TypeScript, Astro, accessibility)                    |
| `npm run check:trailing-slashes` | Validate every internal link/route ends in `/`                   |
| `npm run check:audit`            | Audit production dependencies for high-severity vulnerabilities  |
| `npm run format`                 | Format all files with Prettier                                   |
| `npm run format:check`           | Check formatting without writing (used in CI)                    |
| `npm run preview`                | Preview the production build locally                             |
| `npm test`                       | Run Playwright E2E tests                                         |
| `npm run test:ui`                | Run Playwright tests in interactive UI mode                      |
| `npm run test:contrast`          | Run the report-only color-contrast scan (not part of `npm test`) |
| `npm run check:contrast`         | Aggregate `test:contrast`'s output against the allowlist         |

The `build` script runs `astro check` before `astro build` — TypeScript errors will fail the build on Netlify before anything reaches the CDN.

## CI (GitHub Actions)

Every pull request, and every push to `main`, runs the workflow in `.github/workflows/ci.yml`. It can also be triggered manually (`workflow_dispatch`). Runs are canceled and restarted if you push again to the same branch before the previous run finishes.

Eight jobs run in parallel, all on Node 26:

| Job                  | What it does                                                                                                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository-hygiene` | Fails if generated or sensitive paths (`node_modules`, `dist`, `.astro`, `.env*`, etc.) are accidentally tracked in git                                                                                                                                                                                        |
| `lint`               | `npm run lint`                                                                                                                                                                                                                                                                                                 |
| `format`             | `npm run format:check`                                                                                                                                                                                                                                                                                         |
| `typecheck`          | `npm run typecheck`                                                                                                                                                                                                                                                                                            |
| `audit`              | `npm run check:audit` — production dependencies only, see CLAUDE.md for why                                                                                                                                                                                                                                    |
| `build`              | `npm run check:trailing-slashes`, then `npm run build:app` (skips the `astro check` prefix — the `typecheck` job already covers that on the same commit)                                                                                                                                                       |
| `test`               | `npm run check:trailing-slashes`, installs Chromium, then `npm test`; uploads the Playwright report as a build artifact (30-day retention) regardless of pass/fail                                                                                                                                             |
| `contrast`           | Report-only: runs `npm run test:contrast` + `npm run check:contrast`, then posts (or updates) a single PR comment listing any new color-contrast violations not already in `contrast-allowlist.json`. PR-only — doesn't run on push to `main` — and never fails the build over a site violation; see CLAUDE.md |

Dependabot (`.github/dependabot.yml`) opens npm dependency PRs weekly, capped at 5 open at a time, labeled `dependencies`.

## Deployment

Netlify builds automatically from the `main` branch. Configuration lives almost entirely in `netlify.toml` — the dashboard-only settings are `SLACK_WEBHOOK_URL` (see [CSP violation reporting](#csp-violation-reporting) below) and `SLACK_DEPLOY_WEBHOOK_URL`/`DEPLOY_NOTIFICATION_WEBHOOK_SECRET` (see [Deploy notifications](#deploy-notifications) below), none of which can be committed.

Check what's deployed at any time: `https://philipp.fyi/build.txt`

## CSP violation reporting

`netlify/functions/csp-report.ts` receives the browser's CSP violation reports (wired up via `netlify.toml`'s `report-to`/`report-uri` directives — see CLAUDE.md's CSP section for the full mechanism), logs each one to a `csp-reports` Netlify Blobs store, and posts a summary to Slack.

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

## Deploy notifications

Netlify's native Slack notification type is gated behind Pro/Enterprise, and its generic Outgoing Webhook posts a raw deploy-object JSON that Slack's Incoming Webhook endpoint rejects (`400 no_text`) since it isn't shaped for Slack. `netlify/functions/deploy-notification.ts` receives that raw Outgoing Webhook POST, reformats it into a Slack-compatible message (✅ succeeded / ❌ failed, with the branch, context, and a link to the deploy or the error message), and forwards it to a Slack Incoming Webhook. It's a separate function and a separate Slack channel from CSP violation reporting above, on purpose.

Setup (one-time):

1. In a Slack workspace, add an "Incoming Webhooks" app and create a webhook for the channel that should get deploy alerts.
2. In the Netlify dashboard for this site, add an environment variable named `SLACK_DEPLOY_WEBHOOK_URL` with that webhook's URL. Never commit it to `netlify.toml` or anywhere else in the repo.
3. Generate a random secret (e.g. `openssl rand -hex 32`) and add it as an environment variable named `DEPLOY_NOTIFICATION_WEBHOOK_SECRET`.
4. In the Netlify dashboard, Site settings → Notifications → Deploy notifications, point the "Deploy succeeded" and "Deploy failed" Outgoing Webhook notifications at `https://philipp.fyi/.netlify/functions/deploy-notification` instead of a raw `hooks.slack.com` URL. Each of these is a separate notification config — paste the same secret from step 3 into **both** notifications' JWS secret field, not just one, or the one left unsigned will 401 forever.

If `SLACK_DEPLOY_WEBHOOK_URL` isn't set (e.g. local dev without a `.env` entry for it), the function silently skips the Slack post.

`DEPLOY_NOTIFICATION_WEBHOOK_SECRET` is required, not optional: the function verifies Netlify's `X-Webhook-Signature` JWS against it and fails closed with `401` (logging an error) if the secret isn't configured or the signature doesn't check out — without it, the endpoint's URL being public (documented right here) would let anyone POST a crafted deploy payload and get an attacker-controlled message relayed into Slack. If steps 3 and 4 haven't both been done yet on a fresh setup, deploy notifications will 401 rather than post — configure the secret in both places together.

## Lighthouse CI

Lighthouse runs automatically on every Netlify deploy via the `@netlify/plugin-lighthouse` plugin declared in `netlify.toml`. No setup required — scores appear in the Netlify deploy summary after each build.

The plugin checks Performance, Accessibility, Best Practices, and SEO. For a developer portfolio, the Accessibility and SEO scores are the most visible signal to anyone reviewing the site.

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

| File                          | What it covers                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/home.spec.ts`            | Title, headline, 4 work cards, "See all work" CTA to /work, 6 principle cards, 6 recommendation cards, contact teaser section                               |
| `e2e/navigation.spec.ts`      | Header, nav links (Work, About, Principles, Contact), name mark, theme toggle, skip-to-main-content link                                                    |
| `e2e/work.spec.ts`            | All 4 case study pages render, card links resolve correctly; Work index page heading/cards, interlinks to About/Principles/Recommendations                  |
| `e2e/lightbox.spec.ts`        | Case study image lightbox — open/close, gallery navigation, client-side navigation persistence                                                              |
| `e2e/principles.spec.ts`      | 15 principles shown, numbered 01–15, CTA links to /principles, interlinks to /about, /work, and /recommendations                                            |
| `e2e/recommendations.spec.ts` | 14 recommendations shown, CTA links to /recommendations, interlinks to /about, /principles, and /work                                                       |
| `e2e/about.spec.ts`           | About page heading/bio/facts, tech stack section, CTA links to /about, interlinks to /work, /principles, and /recommendations                               |
| `e2e/404.spec.ts`             | 404 status on unknown routes, correct headline, back home link                                                                                              |
| `e2e/contact.spec.ts`         | Contact page heading/form, LinkedIn/GitHub links, "Send me a message" CTA on home links to /contact, footer mail icon links to /contact                     |
| `e2e/contact-form.spec.ts`    | Contact form validation errors + focus, invalid-email message, mocked failed submission (error banner), mocked successful submission (confirmation + focus) |

Tests run on Desktop Chrome and Pixel 5 (mobile). On CI, workers are set to 1 with a single retry.

`e2e/contrast.spec.ts` is not part of this table or `npm test` — it's a report-only color-contrast scan (light and dark, Desktop Chrome only) run separately via `npm run test:contrast` / `playwright.contrast.config.ts`, aggregated by `npm run check:contrast` against `contrast-allowlist.json`. See the `contrast` CI job above and CLAUDE.md for how it's wired up.

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
description: "One sentence shown on the work card."
category: "Engineering" # or "Design" or "Leadership"
tags: ["Tag One", "Tag Two"]
year: "2024–2025"
featured: true # true = wide card in the grid (only one should be featured)
order: 1 # controls display order — keep as integers, 1 = first
draft: false # true = hidden from the site
coverImage: "./your-screenshot.png" # optional — teaser shown on the home page card
```

Any screenshots used in the case study body (via `<Image>` inside a `<figure>`) automatically get a click-to-enlarge lightbox — no markup or setup needed, see [`ImageLightbox.astro`](src/components/work/ImageLightbox.astro).

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
tags: ["tag"]
```

Create the file as `src/content/blog/your-post-slug.md`.

## OG images

OG images are generated at build time using Satori + Sharp. Satori accepts TTF, OTF, and WOFF — but not WOFF2. Because `@fontsource-variable/fraunces` only ships WOFF2, the project uses `@fontsource/fraunces` (non-variable, 400 weight) specifically for OG image generation. The website itself still uses the variable font via `@fontsource-variable/fraunces`.

Both fonts are loaded from their respective `node_modules/*/files/*.woff` paths at build time. If OG image generation fails, the error message includes a directory listing to help verify the exact filename against the matcher in `src/utils/og-image.ts`.

## Adding analytics

When ready to add Plausible (or another provider):

1. Add the script tag to `src/layouts/BaseLayout.astro` inside `<head>`
2. Update the `Content-Security-Policy` in `netlify.toml` — find the `TODO` comment and add `https://plausible.io` to `script-src` and `connect-src`
3. **Also** add `https://plausible.io` to `astro.config.mjs`'s `security.csp.scriptDirective.resources` — a remote script URL needs to satisfy Astro's auto-generated `<meta>` CSP too, not just the `netlify.toml` header; a browser enforces the intersection of both, so missing this step leaves the script blocked even after step 2

## Key paths

```text
src/
  components/
    home/          → Hero, WorkSection, AboutSection, PrinciplesSection, PrincipleCard, RecommendationsSection, RecommendationCard, ContactSection, SectionHeader
    layout/        → Header, NavLink, Footer, Main
    ui/            → ThemeToggle, ContactForm, SocialIcon, CategoryBadge, InitialsAvatar, InterlinkCard, InterlinkRow, PageHeader
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
  layouts/
    BaseLayout.astro
  pages/
    index.astro
    about.astro
    contact.astro
    principles.astro
    recommendations.astro
    work/index.astro
    work/[slug].astro
    blog/index.astro
    blog/[slug].astro
    404.astro
    build.txt.ts
    og/[...slug].png.ts
  styles/
    global.css     → Tailwind v4 config, design tokens, dark mode
  utils/
    og-image.ts        → Satori template + Sharp PNG generation
    experience.ts      → Computes career-length and Staffbase-tenure year figures from fixed dates
    category-colors.ts → Shared category → badge-color mapping (Tailwind classes + Satori hex equivalents)
    nav-active.ts      → Shared active-nav-link match + class vocabulary, used by NavLink.astro and Header.astro's client script
e2e/               → Playwright E2E tests
public/
  favicon.svg
  robots.txt
netlify/
  functions/
    _shared/
      slack.ts             → Shared postToSlack() helper used by both functions below
    csp-report.ts          → Receives CSP violation reports, logs to Netlify Blobs, posts to Slack
    deploy-notification.ts → Reformats Netlify's raw deploy webhook into a Slack message, posts to Slack
netlify.toml       → Build, Node version, Lighthouse plugin, security headers, 404 redirect, CSP reporting headers
playwright.config.ts
```
