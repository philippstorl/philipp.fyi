import { defineConfig, devices } from '@playwright/test'

// Separate from playwright.config.ts so `npm test` never picks up this
// report-only check (CLAUDE.md). Single project — contrast doesn't vary by viewport.
export default defineConfig({
    testDir: './e2e',
    testMatch: '**/contrast.spec.ts',
    globalSetup: './e2e/contrast.global-setup.ts',

    fullyParallel: true,

    forbidOnly: !!process.env.CI,

    reporter: 'list',

    use: {
        baseURL: 'http://localhost:4321',
        // Avoids axe sampling Hero.astro's fade mid-animation. Doesn't reliably
        // reach matchMedia alone -- real fix is contrast.spec.ts's emulateMedia().
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
