import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',

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
        // Astro 7 auto-detects agentic environments (e.g. Claude Code, via
        // the CLAUDECODE env var) and silently daemonizes `astro dev` in the
        // background instead of running it in the foreground. That breaks
        // Playwright's process ownership: the spawned command exits
        // immediately, the orphaned daemon survives past this test run, and
        // a later `npm run build` can overwrite its shared Vite dep cache
        // out from under it — corrupting React hydration for as long as the
        // daemon lives. Setting this env var opts back into normal
        // foreground behavior regardless of who invokes the command.
        env: { ASTRO_DEV_BACKGROUND: '1' },
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 5'] } },
    ],
})
