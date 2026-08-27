import fs from 'node:fs'
import path from 'node:path'

// Runs once in the main process, unlike beforeAll (once per worker) --
// avoids two workers racing to wipe/recreate contrast-results/.
export default function globalSetup() {
    const outDir = path.join(process.cwd(), 'contrast-results')
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(outDir, { recursive: true })
}
