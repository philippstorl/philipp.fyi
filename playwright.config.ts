import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',

    // Contrast checks run separately via playwright.contrast.config.ts —
    // report-only, not part of the pass/fail test suite. See CLAUDE.md.
    testIgnore: '**/contrast.spec.ts',

    fullyParallel: true,

    // Fail the build on CI if test.only is left in
    forbidOnly: !!process.env.CI,

    retries: process.env.CI ? 1 : 0,

    // Single worker on CI for stability
    workers: process.env.CI ? 1 : undefined,

    reporter: 'html',

    use: {
        baseURL: 'http://localhost:4321',
        trace: 'on-first-retry',
    },

    webServer: {
        command: 'npm run dev:astro',
        url: 'http://localhost:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        // Without this, Astro daemonizes `astro dev` in agentic envs and
        // orphans it, corrupting later builds' Vite cache (CLAUDE.md).
        env: { ASTRO_DEV_BACKGROUND: '1' },
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 5'] } },
    ],
})
