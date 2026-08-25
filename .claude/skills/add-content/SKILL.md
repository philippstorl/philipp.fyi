---
name: add-content
description: Add a new case study, principle, or blog post to philipp.fyi's content collections (src/content/work, src/content/principles, src/content/blog). Covers the exact frontmatter schema for each collection and — the part that's easy to get wrong — exactly which e2e test assertions in e2e/*.spec.ts need to change for each kind of addition, and which don't. Use whenever the user asks to add, create, or write a new case study, work entry, portfolio piece, principle, or blog post.
---

# Adding content

This site has three content collections, each with different ordering rules and different coupling to the e2e tests. The schema itself is defined in `src/content.config.ts` — read it if anything below seems out of date. The risk with this task isn't writing the content, it's forgetting one of the files that has to change alongside it.

## Case study (`src/content/work/`)

1. Create `src/content/work/<slug>.mdx` — the filename **is** the URL slug (`/work/<slug>/`), so pick it deliberately; it can't be changed later without breaking links.
2. Frontmatter:
    - `title`, `description` — plain strings. `description` is shown on the work card and the case-study page's own intro, and is also what `<meta name="description">`/`og:description`/`twitter:description` use — one field, no separate meta-only variant. Keep it at or under ~155 chars (Google/social previews truncate past that) and write it tight from the start; a punchy, snippet-length sentence has read better everywhere it's been tried than a longer narrative one, so don't reach for extra length assuming the on-page copy needs more room.
    - `year` — a 4-digit year (`"2024"`) or an en-dash year range for multi-year work (`"2022–2024"`, using an actual en dash `–`, not a hyphen `-`) — validated by a zod regex, anything else fails the build.
    - `tags: [...]` — at least one tag; an empty array fails the build.
    - `category` — must be exactly `"Engineering"`, `"Leadership"`, or `"Design"` (zod enum, anything else fails the build).
    - `order` — a nonnegative integer (zod `.int().nonnegative()`). List the existing files in this directory and use one higher than the current max.
    - `featured` — boolean, defaults to `false`. Check the existing entries first: the homepage's `WorkSection.astro` destructures `[featured, ...rest]` from the collection, so **exactly one** entry across the whole collection should have `featured: true`. Don't add a second one.
    - `draft` — defaults to `false`.
    - `coverImage` — optional, e.g. `"./screenshot.png"`. Only set it if you actually have a screenshot in the same folder; it's the teaser shown on the homepage work card. Omitting it is fine — the card falls back to a text-only layout.
3. Body: screenshots go through `<ResponsiveFigure>` (`src/components/ui/ResponsiveFigure.astro`), not a hand-written `<figure><Image/><figcaption/></figure>` block — pass `src`/`alt`/`caption` plus a sizing spread from `src/utils/content-image-sizing.ts` (`{...gridFigureSizing(3)}` for a grid cell, `{...fullWidthFigureSizing()}` for a standalone full-width figure, etc. — see CLAUDE.md for the full set and when to use each). **Don't also pass an explicit `width` prop** — every sizing helper's spread already includes the correct `width` as part of what it returns; a hand-typed `width` is either redundant (if it appears before the spread) or silently wrong (if it appears after the spread and overrides the computed one, desyncing the image from its own `sizes`/`widths`). This automatically gets the click-to-enlarge lightbox via `ImageLightbox.astro` — no extra markup needed beyond the `ResponsiveFigure` call itself.
4. Update tests — the homepage renders **every** work entry (no preview slice), so both of these need to change:
    - `e2e/work.spec.ts` — add `{ slug, title }` to the `caseStudies` array so the new page gets its own render assertion.
    - `e2e/home.spec.ts` — the test named `shows all N work cards` asserts `toHaveCount(N)` where N is the current total. Bump it to match the new total.
    - `e2e/meta-description-length.spec.ts` — add `{ reportedPath: '/work/<slug>/', gotoPath: '/work/<slug>/' }` to its `pages` array so the new case study's meta description length is guarded too, not just the ones that happened to be over length when that test was written.

## Principle (`src/content/principles/`)

1. Create `src/content/principles/NN-slug.md` — list existing files, take the highest two-digit prefix, increment it, zero-pad. Order comes **only** from this filename prefix; there is no `order` field in the schema. Renaming the file later reorders it.
2. Frontmatter: just `title` and `description`.
3. Update tests:
    - `e2e/principles.spec.ts` — bump the `toHaveCount(N)` assertion in `shows all principles`, and the literal number string in `last principle is numbered N`.
    - `e2e/home.spec.ts`'s `shows N principle cards` test does **NOT** need to change. `PrinciplesSection.astro` always shows exactly the first 6 principles sorted by filename (`.slice(0, 6)`), regardless of how many exist in total — only the `/principles/` page shows the full list. The homepage count only shifts if you insert a new principle with a prefix _lower_ than 06, which displaces one of the current top 6 (rare — new principles are normally appended at the end).

## Blog post (`src/content/blog/`)

1. Copy `src/content/blog/_template.md` to `src/content/blog/<slug>.md` and fill it in — it already has the right frontmatter shape and a reminder note at the bottom.
2. Frontmatter: `title`, `description`, `date`, `tags: [...]` — at least one tag required, there's no default so it can't be omitted. `draft` defaults to `true` in the schema.
3. **Never set `draft: false` on your own initiative** — leave new posts as drafts unless the user explicitly asks you to publish this one. This is a standing project rule, not a one-off judgment call.
4. No e2e test currently asserts anything about blog post count or content — nothing else to update.

## After any of the above

Run `npm run check:trailing-slashes` if you added or touched any internal link, then the usual format/lint/typecheck/build/test pass (see the `preflight` skill, or CLAUDE.md's "Commands Claude should run" section) before considering the change done.
