import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',

    // Run tests in parallel
    fullyParallel: true,

    // Fail the build on CI if test.only is left in
    forbidOnly: !!process.env.CI,

    // Retry once on CI
    retries: process.env.CI ? 1 : 0,

    // Single worker on CI for stability
    workers: process.env.CI ? 1 : undefined,

    reporter: 'html',

    use: {
        baseURL: 'http://localhost:4321',
        trace: 'on-first-retry',
    },

    // Start the Astro dev server before tests run
    webServer: {
        command: 'npm run dev:astro',
        url: 'http://localhost:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile',   use: { ...devices['Pixel 5'] } },
    ],
})
