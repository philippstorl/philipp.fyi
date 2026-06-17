# philipp.fyi

Personal portfolio site for Philipp Storl — built with Astro v6, Tailwind CSS v4, React, and deployed on Netlify.

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

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server via Netlify CLI (recommended) |
| `npm run dev:astro` | Start Astro dev server directly |
| `npm run build` | Type-check + build to `dist/` |
| `npm run typecheck` | Run `astro check` (TypeScript only) |
| `npm run lint` | Run ESLint (TypeScript, Astro, accessibility) |
| `npm run format` | Format all files with Prettier |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Playwright E2E tests |
| `npm run test:ui` | Run Playwright tests in interactive UI mode |

The `build` script runs `astro check` before `astro build` — TypeScript errors will fail the build on Netlify before anything reaches the CDN.

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

| File | What it covers |
|---|---|
| `e2e/home.spec.ts` | Title, headline, 4 work cards, 6 principle cards, contact section |
| `e2e/navigation.spec.ts` | Header, nav links, name mark, theme toggle |
| `e2e/work.spec.ts` | All 4 case study pages render, card links resolve correctly |
| `e2e/principles.spec.ts` | 13 principles shown, numbered 01–13, CTA links to /principles |
| `e2e/404.spec.ts` | 404 status on unknown routes, correct headline, back home link |

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
featured: true     # true = wide card in the grid (only one should be featured)
order: 1           # controls display order — keep as integers, 1 = first
draft: false       # true = hidden from the site
```

### Principles — `src/content/principles/`

Thirteen `.md` files named `01-title.md` through `13-title.md`. The filename prefix controls sort order — rename a file to reorder it. No `order` field in frontmatter.

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

```
src/
  components/
    home/          → Hero, WorkSection, WorkCard, PrinciplesSection, PrincipleCard, AboutSection, ContactSection
    layout/        → Header, Footer
    ui/            → ThemeToggle, ContactForm, SocialIcon
    work/          → CaseStudyLayout
  content/
    work/          → Case study MDX files (4 entries)
    principles/    → Principle MD files (13 entries)
    blog/          → Blog post MD files (all draft by default)
  data/
    about.ts       → About section copy and facts
    hero.ts        → Hero section copy
    navigation.ts  → Nav items
    social.ts      → LinkedIn, GitHub, Contact links
  layouts/
    BaseLayout.astro
  pages/
    index.astro
    principles.astro
    work/[slug].astro
    blog/index.astro
    blog/[slug].astro
    404.astro
    build.txt.ts
    og/[...slug].png.ts
  styles/
    global.css     → Tailwind v4 config, design tokens, dark mode
  utils/
    og-image.ts    → Satori template + Sharp PNG generation
e2e/               → Playwright E2E tests
public/
  favicon.svg
  robots.txt
netlify.toml       → Build, Node version, Lighthouse plugin, security headers, 404 redirect
playwright.config.ts
```
