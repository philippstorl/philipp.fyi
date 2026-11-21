import fs from 'fs/promises'
import path from 'path'

export const dist = path.resolve(import.meta.dirname, '..', 'dist')

async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
        entries.map((entry) => {
            const full = path.join(dir, entry.name)
            return entry.isDirectory() ? walk(full) : [full]
        }),
    )
    return files.flat()
}

// Every file under dist/, for the check:* scripts; exits 1 if there's no build.
export async function listDistFiles() {
    try {
        return await walk(dist)
    } catch (error) {
        if (error.code !== 'ENOENT') throw error
        console.error('dist/ not found. Run `npm run build` first.')
        process.exit(1)
    }
}
