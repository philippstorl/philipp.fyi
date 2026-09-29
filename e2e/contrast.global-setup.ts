import fs from 'node:fs'
import path from 'node:path'
import type { FullConfig } from '@playwright/test'
import { warmDevServer } from './helpers/warm-dev-server'

// Runs once in the main process, unlike beforeAll (once per worker) --
// avoids two workers racing to wipe/recreate contrast-results/.
export default async function globalSetup(config: FullConfig) {
    const outDir = path.join(process.cwd(), 'contrast-results')
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(outDir, { recursive: true })

    await warmDevServer(config)
}
