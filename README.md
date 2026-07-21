# philipp.fyi

[![Netlify Status](https://api.netlify.com/api/v1/badges/298b597c-afe1-458b-9c18-b261be8eef05/deploy-status)](https://app.netlify.com/projects/philipp-storl/deploys)
[![CI](https://github.com/philippstorl/philipp.fyi/actions/workflows/ci.yml/badge.svg)](https://github.com/philippstorl/philipp.fyi/actions/workflows/ci.yml)

Personal portfolio site for Philipp Storl — built with Astro v7, Tailwind CSS v4, React, and deployed on Netlify.

## Prerequisites

- **Node.js 26** — matches the version set in `netlify.toml` (Current release, enters LTS October 2026)
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

| Command                          | What it does                                   |
| -------------------------------- | ---------------------------------------------- |
| `npm run dev`                    | Start dev server via Netlify CLI (recommended) |
| `npm run dev:astro`              | Start Astro dev server directly                |
| `npm run build`                  | Type-check + build to `dist/`                  |
| `npm run typecheck`              | Run `astro check` (TypeScript only)            |
| `npm run lint`                   | Run ESLint (TypeScript, Astro, accessibility)  |
| `npm run check:trailing-slashes` | Validate every internal link/route ends in `/` |
| `npm run format`                 | Format all files with Prettier                 |
| `npm run format:check`           | Check formatting without writing (used in CI)  |
| `npm run preview`                | Preview the production build locally           |
| `npm test`                       | Run Playwright E2E tests                       |
| `npm run test:ui`                | Run Playwright tests in interactive UI mode    |

The `build` script runs `astro check` before `astro build` — TypeScript errors will fail the build on Netlify before anything reaches the CDN.

## CI (GitHub Actions)

Every pull request, and every push to `main`, runs the workflow in `.github/workflows/ci.yml`. It can also be triggered manually (`workflow_dispatch`). Runs are canceled and restarted if you push again to the same branch before the previous run finishes.

Six jobs run in parallel, all on Node 26:

| Job                  | What it does                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repository-hygiene` | Fails if generated or sensitive paths (`node_modules`, `dist`, `.astro`, `.env*`, etc.) are accidentally tracked in git                                            |
| `lint`               | `npm run lint`                                                                                                                                                     |
| `format`             | `npm run format:check`                                                                                                                                             |
| `typecheck`          | `npm run typecheck`                                                                                                                                                |
| `build`              | `npm run check:trailing-slashes`, then `npm run build`                                                                                                             |
| `test`               | `npm run check:trailing-slashes`, installs Chromium, then `npm test`; uploads the Playwright report as a build artifact (30-day retention) regardless of pass/fail |

Dependabot (`.github/dependabot.yml`) opens npm dependency PRs weekly, capped at 5 open at a time, labeled `dependencies`.

## Deployment

Netlify builds automatically from the `main` branch. Configuration lives entirely in `netlify.toml` — no dashboard settings to worry about.

Check what's deployed at any time: `https://philipp.fyi/build.txt`

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

| File                          | What it covers                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `e2e/home.spec.ts`            | Title, headline, 4 work cards, 6 principle cards, 6 recommendation cards, contact section      |
| `e2e/navigation.spec.ts`      | Header, nav links, name mark, theme toggle                                                     |
| `e2e/work.spec.ts`            | All 4 case study pages render, card links resolve correctly                                    |
| `e2e/lightbox.spec.ts`        | Case study image lightbox — open/close, gallery navigation, client-side navigation persistence |
| `e2e/principles.spec.ts`      | 15 principles shown, numbered 01–15, CTA links to /principles                                  |
| `e2e/recommendations.spec.ts` | 13 recommendations shown, CTA links to /recommendations                                        |
| `e2e/404.spec.ts`             | 404 status on unknown routes, correct headline, back home link                                 |

Tests run on Desktop Chrome and Pixel 5 (mobile). On CI, workers are set to 1 with a single retry.

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

## Key paths

```text
src/
  components/
    home/          → Hero, WorkSection, WorkCard, PrinciplesSection, PrincipleCard, RecommendationsSection, RecommendationCard, AboutSection, ContactSection
    layout/        → Header, Footer
    ui/            → ThemeToggle, ContactForm, SocialIcon, CategoryBadge, InitialsAvatar
    work/          → CaseStudyLayout, ImageLightbox
  content/
    work/          → Case study MDX files (4 entries)
    principles/    → Principle MD files (15 entries)
    blog/          → Blog post MD files (all draft by default)
  data/
    about.ts            → About section copy and facts
    hero.ts             → Hero section copy
    navigation.ts       → Nav items
    social.ts           → LinkedIn, GitHub, Contact links
    recommendations.ts  → LinkedIn recommendations (13 entries, 6 featured on the home page)
  layouts/
    BaseLayout.astro
  pages/
    index.astro
    principles.astro
    recommendations.astro
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
e2e/               → Playwright E2E tests
public/
  favicon.svg
  robots.txt
netlify.toml       → Build, Node version, Lighthouse plugin, security headers, 404 redirect
playwright.config.ts
```
