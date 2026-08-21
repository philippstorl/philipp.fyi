/** Screen-reader-only suffix appended to an external link's accessible name,
 * so opening in a new tab isn't a surprise. Shared by NewTabIndicator.astro
 * (a visually-hidden span, for links with visible text) and Footer.astro's
 * social icons (concatenated into `aria-label` directly, since an icon-only
 * link has no visible text child to append a span to) — two different DOM
 * mechanisms, but one source for the exact wording so they can't drift. */
export const NEW_TAB_SUFFIX = ' (opens in a new tab)'
