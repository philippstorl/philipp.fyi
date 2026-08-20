import { defineConfig, devices } from '@playwright/test'

// Separate config for the color-contrast check (see e2e/contrast.spec.ts).
// It reuses the same dev server/baseURL setup as playwright.config.ts, but
// runs only that one spec, on a single project — contrast doesn't vary by
// viewport/device, so there's no value in doubling the run across chromium
// and mobile. Kept as its own config (rather than a project in the main
// one) so `npm test` never picks it up: this check is intentionally
// report-only and shouldn't affect the pass/fail test suite. See CLAUDE.md.
export default defineConfig({
    testDir: './e2e',
    testMatch: '**/contrast.spec.ts',
    globalSetup: './e2e/contrast.global-setup.ts',

    fullyParallel: true,

    forbidOnly: !!process.env.CI,

    reporter: 'list',

    use: {
        baseURL: 'http://localhost:4321',
        // Several homepage elements (Hero.astro's animate-fade-up) run a
        // one-shot entrance fade gated behind `prefers-reduced-motion:
        // no-preference` (see global.css / CLAUDE.md). Without forcing
        // reduced motion, axe sometimes samples mid-fade opacity and
        // reports a false low-contrast violation depending on exactly when
        // the scan lands relative to the animation. This config option
        // alone doesn't reliably reach the page's matchMedia, though — the
        // actual fix is the explicit page.emulateMedia() call in
        // e2e/contrast.spec.ts. Kept here too as a harmless defensive
        // default in case that ever changes.
        reducedMotion: 'reduce',
    },

    webServer: {
        command: 'npm run dev:astro',
        url: 'http://localhost:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        // See the matching comment in playwright.config.ts.
        env: { ASTRO_DEV_BACKGROUND: '1' },
    },

    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
