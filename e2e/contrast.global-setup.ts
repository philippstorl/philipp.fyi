import fs from 'node:fs'
import path from 'node:path'

// Playwright's globalSetup runs exactly once in the main process before any
// worker starts — unlike test.beforeAll, which runs once per worker. With
// fullyParallel and multiple workers, a beforeAll-based rmSync/mkdirSync
// here would race: one worker could wipe contrast-results/ out from under
// another worker that already wrote a result file into it.
export default function globalSetup() {
    const outDir = path.join(process.cwd(), 'contrast-results')
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(outDir, { recursive: true })
}
