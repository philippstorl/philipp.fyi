import { defineConfig } from '@playwright/test'

// Unit tests for netlify/functions: plain Node, no browser or dev server,
// since astro dev (the e2e suite's server) doesn't serve functions.
export default defineConfig({
    testDir: './tests/functions',

    forbidOnly: !!process.env.CI,

    reporter: 'list',
})
