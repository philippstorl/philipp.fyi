import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const allowedExtensions = new Set(['.astro', '.ts', '.tsx', '.js'])
const ignoreDirs = new Set([
    'node_modules',
    'dist',
    '.astro',
    '.git',
    'playwright-report',
    'test-results',
    '.vscode',
    '.idea',
])

const excludedStaticPageNames = new Set(['index', '404'])

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function deriveRoutes() {
    const pagesDir = path.join(root, 'src/pages')
    const entries = await fs.readdir(pagesDir, { withFileTypes: true })
    const staticRoutes = []
    const dynamicPrefixes = []

    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.astro')) {
            const name = entry.name.replace(/\.astro$/, '')
            if (!excludedStaticPageNames.has(name)) staticRoutes.push(name)
        } else if (entry.isDirectory()) {
            const subEntries = await fs.readdir(path.join(pagesDir, entry.name))
            if (subEntries.includes('index.astro')) {
                staticRoutes.push(entry.name)
            }
            if (subEntries.some((f) => /^\[\.{0,3}slug\]\.astro$/.test(f))) {
                dynamicPrefixes.push(entry.name)
            }
        }
    }

    return { staticRoutes, dynamicPrefixes }
}

function buildChecks({ staticRoutes, dynamicPrefixes }) {
    const checks = []

    for (const route of staticRoutes) {
        const escaped = escapeRegex(route)
        checks.push({
            name: `missing trailing slash for /${route}`,
            regex: new RegExp(
                `href\\s*=\\s*\\{?\\s*['"]\\/${escaped}(?=['"\\s\\}])`,
                'g',
            ),
        })
    }

    for (const prefix of dynamicPrefixes) {
        const escaped = escapeRegex(prefix)
        checks.push({
            name: `missing trailing slash for /${prefix} route`,
            regex: new RegExp(
                `href\\s*=\\s*\\{?\\s*['"]\\/${escaped}\\/[^'"\\s]+[^\\/\\s'"\\}](['"]\\s*\\}?)`,
                'g',
            ),
        })
        checks.push({
            name: `missing trailing slash in template-literal href for /${prefix} route`,
            regex: new RegExp(
                `(?:href\\s*=\\s*\\{\\s*|(?:const|let)\\s+\\w+\\s*=\\s*)\`\\/${escaped}\\/[^\`#]*\\$\\{[^}]*\\}[^\`\\/]*\``,
                'g',
            ),
        })
    }

    const gotoPattern = [
        ...staticRoutes.map((r) => escapeRegex(r)),
        ...dynamicPrefixes.map(
            (p) => `${escapeRegex(p)}\\/[^'"\\s]+[^\\/\\s'"\\}]`,
        ),
    ].join('|')

    checks.push({
        name: 'missing trailing slash in page.goto',
        regex: new RegExp(
            `page\\.goto\\(\\s*['"]\\/(${gotoPattern})['"]\\s*\\)`,
            'g',
        ),
    })
    checks.push({
        name: 'missing trailing slash in toHaveURL',
        regex: new RegExp(
            `toHaveURL\\(\\s*['"]\\/(${gotoPattern})['"]\\s*\\)`,
            'g',
        ),
    })

    return checks
}

async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        if (ignoreDirs.has(entry.name)) continue
        const resolved = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...(await walk(resolved)))
        } else if (allowedExtensions.has(path.extname(entry.name))) {
            files.push(resolved)
        }
    }

    return files
}

async function main() {
    const routes = await deriveRoutes()
    const checks = buildChecks(routes)
    const files = await walk(root)
    const violations = []

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8')
        for (const check of checks) {
            const matches = [...content.matchAll(check.regex)]
            if (matches.length > 0) {
                for (const match of matches) {
                    const index = match.index ?? 0
                    const line = content.slice(0, index).split('\n').length
                    const text = match[0].trim()
                    violations.push({
                        file: path.relative(root, file),
                        line,
                        name: check.name,
                        text,
                    })
                }
            }
        }
    }

    if (violations.length > 0) {
        console.error(
            '\nTrailing slash validation failed. Found the following non-trailing-slash route references:',
        )
        for (const violation of violations) {
            console.error(
                `- ${violation.file}:${violation.line} [${violation.name}] ${violation.text}`,
            )
        }
        process.exit(1)
    }

    console.log('Trailing slash validation passed.')
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
