import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const allowedExtensions = new Set(['.astro', '.ts', '.tsx', '.js'])
// Markdown is only scanned under src/ (site content); repo docs quote bad examples.
const contentExtensions = new Set(['.md', '.mdx'])
const contentRoot = path.join(root, 'src') + path.sep
const ignoreDirs = new Set([
    'node_modules',
    'dist',
    '.astro',
    '.git',
    '.netlify',
    // Claude Code worktrees (full repo copies) live under .claude/worktrees/.
    '.claude',
    'playwright-report',
    'test-results',
    '.vscode',
    '.idea',
])

// Astro builds these flat (dist/404.html) despite trailingSlash; see
// netlify.toml's /404 redirect.
const excludedRootRoutes = new Set(['404', '500'])
// Mirrors Astro's page extensions (astro/dist/core/routing/create-manifest.js).
const pageExtensions = new Set([
    '.astro',
    '.md',
    '.mdx',
    '.markdown',
    '.mdown',
    '.mkdn',
    '.mkd',
    '.mdwn',
])
const endpointExtensions = new Set(['.ts', '.js'])
const isParamSegment = (segment) => segment.includes('[')

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Returns each routable file's path segments, skipping what Astro's router skips.
async function walkPages(dir, segments = []) {
    const routes = []

    for (const basename of await fs.readdir(dir)) {
        if (basename.startsWith('_')) continue
        if (basename.startsWith('.') && basename !== '.well-known') continue
        const resolved = path.join(dir, basename)
        // stat (not Dirent) so symlinked directories are followed, like Astro.
        if ((await fs.stat(resolved)).isDirectory()) {
            routes.push(...(await walkPages(resolved, [...segments, basename])))
            continue
        }
        const ext = path.extname(basename)
        const name = basename.slice(0, -ext.length)
        // Astro exempts only endpoints whose route has an extension (rss.xml.ts).
        const isRoute =
            pageExtensions.has(ext) ||
            (endpointExtensions.has(ext) && !name.includes('.'))
        if (!isRoute) continue
        routes.push(name === 'index' ? segments : [...segments, name])
    }

    return routes
}

async function deriveRoutes() {
    const staticRoutes = new Set()
    const dynamicPrefixes = new Set()

    for (const segments of await walkPages(path.join(root, 'src/pages'))) {
        const paramIndex = segments.findIndex(isParamSegment)
        if (paramIndex === -1) {
            const route = segments.join('/')
            if (route && !excludedRootRoutes.has(route)) staticRoutes.add(route)
        } else if (paramIndex > 0) {
            // A root-level param (src/pages/[lang]/...) has no literal prefix to match.
            dynamicPrefixes.add(segments.slice(0, paramIndex).join('/'))
        }
    }

    // A dynamic prefix's checks already match every route under it (work/page under work).
    const prefixes = [...dynamicPrefixes]
    const isCovered = (route) => prefixes.some((q) => route.startsWith(`${q}/`))
    return {
        staticRoutes: [...staticRoutes].filter((r) => !isCovered(r)).sort(),
        dynamicPrefixes: prefixes.filter((p) => !isCovered(p)).sort(),
    }
}

// JSX/HTML attribute (`href="..."`, `href={...}`) or object property (`href: '...'`).
const hrefPrefix = String.raw`(?:href\s*=\s*\{?|\bhref\s*:)\s*`

function buildChecks({ staticRoutes, dynamicPrefixes }) {
    const checks = []

    for (const route of staticRoutes) {
        const escaped = escapeRegex(route)
        checks.push({
            name: `missing trailing slash for /${route}`,
            regex: new RegExp(
                `${hrefPrefix}['"\`]\\/${escaped}(?=['"\`\\s\\}#?])`,
                'g',
            ),
        })
        checks.push({
            name: `missing trailing slash in Markdown link for /${route}`,
            regex: new RegExp(`\\]\\(\\s*\\/${escaped}(?=[)#?\\s])`, 'g'),
        })
    }

    for (const prefix of dynamicPrefixes) {
        const escaped = escapeRegex(prefix)
        checks.push({
            name: `missing trailing slash for /${prefix} route`,
            regex: new RegExp(
                `${hrefPrefix}['"\`]\\/${escaped}\\/[^'"\`\\s#?]*[^\\/\\s'"\`\\}#?](?=['"\`#?])`,
                'g',
            ),
        })
        checks.push({
            name: `missing trailing slash in template-literal href for /${prefix} route`,
            regex: new RegExp(
                `(?:href\\s*=\\s*\\{\\s*|\\bhref\\s*:\\s*|(?:const|let)\\s+\\w+\\s*=\\s*)\`\\/${escaped}\\/[^\`#?]*\\$\\{[^}]*\\}[^\`\\/]*\``,
                'g',
            ),
        })
        checks.push({
            name: `missing trailing slash in Markdown link for /${prefix} route`,
            regex: new RegExp(
                `\\]\\(\\s*\\/${escaped}\\/[^)\\s#?]*[^\\/)\\s#?](?=[)#?\\s])`,
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
        } else {
            const ext = path.extname(entry.name)
            if (
                allowedExtensions.has(ext) ||
                (contentExtensions.has(ext) && resolved.startsWith(contentRoot))
            ) {
                files.push(resolved)
            }
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
