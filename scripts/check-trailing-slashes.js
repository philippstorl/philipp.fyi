import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const allowedExtensions = new Set(['.astro', '.ts', '.tsx', '.js'])
const ignoreDirs = new Set(['node_modules', 'dist', '.astro', '.git', 'playwright-report', 'test-results', '.vscode', '.idea'])

const checks = [
  {
    name: 'missing trailing slash for /principles',
    regex: /href\s*=\s*\{?\s*['"]\/principles(?=['"\s\}])/g,
  },
  {
    name: 'missing trailing slash for /blog',
    regex: /href\s*=\s*\{?\s*['"]\/blog(?=['"\s\}])/g,
  },
  {
    name: 'missing trailing slash for /work route',
    regex: /href\s*=\s*\{?\s*['"]\/work\/[^'"\s]+[^\/\s'"\}](['"]\s*\}?)/g,
  },
  {
    name: 'missing trailing slash in page.goto',
    regex: /page\.goto\(\s*['"]\/(principles|blog|work\/[^'"\s]+[^\/\s'"\}])['"]\s*\)/g,
  },
  {
    name: 'missing trailing slash in toHaveURL',
    regex: /toHaveURL\(\s*['"]\/(principles|blog|work\/[^'"\s]+[^\/\s'"\}])['"]\s*\)/g,
  },
]

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue
    const resolved = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(resolved))
    } else if (allowedExtensions.has(path.extname(entry.name))) {
      files.push(resolved)
    }
  }

  return files
}

async function main() {
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
          violations.push({ file: path.relative(root, file), line, name: check.name, text })
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('\nTrailing slash validation failed. Found the following non-trailing-slash route references:')
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.name}] ${violation.text}`)
    }
    process.exit(1)
  }

  console.log('Trailing slash validation passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
