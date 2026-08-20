import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedResultFileNames } from './contrast-pages.mjs'

// Aggregates the per-page/theme axe-core results written by
// e2e/contrast.spec.ts (via `npm run test:contrast`) into a single list of
// color-contrast violations, filters out anything already accepted in
// contrast-allowlist.json, and writes a Markdown report plus a machine-
// readable status for CI to turn into a PR comment. This check itself is
// intentionally report-only about the *site's* contrast (see CLAUDE.md/
// issue #149) — it never fails merely because a page has a violation — but
// it does exit non-zero if the scan is missing results for any page/theme
// it's supposed to cover (checked against contrast-pages.mjs's own list,
// so a crashed or timed-out individual test can't hide as "nothing to
// report"), since a partial scan is a pipeline failure, not a clean result.

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const resultsDir = path.join(root, 'contrast-results')
const allowlistPath = path.join(root, 'contrast-allowlist.json')
const summaryPath = path.join(resultsDir, 'summary.md')
const statusPath = path.join(resultsDir, 'status.json')

// Files this script itself writes — excluded when re-scanning resultsDir
// for e2e/contrast.spec.ts's per-page/theme axe reports.
const ownOutputFiles = new Set(['status.json'])

function loadAllowlist() {
    if (!fs.existsSync(allowlistPath)) return []
    return JSON.parse(fs.readFileSync(allowlistPath, 'utf8'))
}

function isAllowlisted(allowlist, violation) {
    return allowlist.some(
        (entry) =>
            entry.page === violation.page &&
            entry.theme === violation.theme &&
            entry.selector === violation.selector,
    )
}

function loadResultFiles() {
    if (!fs.existsSync(resultsDir)) return []
    return fs
        .readdirSync(resultsDir)
        .filter((name) => name.endsWith('.json') && !ownOutputFiles.has(name))
}

function loadViolations(files) {
    const violations = []
    for (const file of files) {
        const report = JSON.parse(
            fs.readFileSync(path.join(resultsDir, file), 'utf8'),
        )
        for (const rule of report.violations) {
            for (const node of rule.nodes) {
                const check = [...(node.any ?? []), ...(node.all ?? [])].find(
                    (c) => c.data?.fgColor,
                )
                violations.push({
                    page: report.page,
                    theme: report.theme,
                    selector: node.target.join(', '),
                    html: node.html,
                    fgColor: check?.data?.fgColor ?? 'unknown',
                    bgColor: check?.data?.bgColor ?? 'unknown',
                    contrastRatio: check?.data?.contrastRatio ?? 'unknown',
                    expectedContrastRatio:
                        check?.data?.expectedContrastRatio ?? 'unknown',
                })
            }
        }
    }
    return violations
}

function buildSummary(newViolations) {
    const lines = ['<!-- contrast-report -->', '## Color contrast report', '']
    if (newViolations.length > 0) {
        lines.push(
            `Found ${newViolations.length} new color-contrast violation${newViolations.length === 1 ? '' : 's'} not already in \`contrast-allowlist.json\`.`,
            '',
            '| Page | Theme | Selector | Foreground | Background | Ratio found | Ratio required |',
            '| --- | --- | --- | --- | --- | --- | --- |',
        )
        for (const v of newViolations) {
            lines.push(
                `| \`${v.page}\` | ${v.theme} | \`${v.selector}\` | \`${v.fgColor}\` | \`${v.bgColor}\` | ${v.contrastRatio} | ${v.expectedContrastRatio} |`,
            )
        }
        lines.push(
            '',
            'This check is report-only and does not block merging. If a violation is intentional, add it to `contrast-allowlist.json` with a reason.',
        )
    } else {
        lines.push('No new color-contrast violations found.')
    }
    return lines.join('\n')
}

const resultFiles = loadResultFiles()
const foundFiles = new Set(resultFiles)
const missingFiles = expectedResultFileNames().filter(
    (name) => !foundFiles.has(name),
)

if (missingFiles.length > 0) {
    console.error(
        `Missing ${missingFiles.length} of ${expectedResultFileNames().length} expected contrast scan result(s) — the scan itself likely failed or timed out for these page/theme combinations before writing output: ${missingFiles.join(', ')}. This is a pipeline failure, not a clean result.`,
    )
    process.exit(1)
}

const allowlist = loadAllowlist()
const allViolations = loadViolations(resultFiles)
const newViolations = allViolations.filter((v) => !isAllowlisted(allowlist, v))

fs.mkdirSync(resultsDir, { recursive: true })
fs.writeFileSync(summaryPath, buildSummary(newViolations))
fs.writeFileSync(
    statusPath,
    JSON.stringify(
        {
            hasNew: newViolations.length > 0,
            newCount: newViolations.length,
            totalCount: allViolations.length,
        },
        null,
        2,
    ),
)

if (newViolations.length > 0) {
    console.log(
        `${newViolations.length} new color-contrast violation(s) found (${allViolations.length} total, ${allViolations.length - newViolations.length} allowlisted). See ${path.relative(root, summaryPath)}.`,
    )
} else {
    console.log(
        `No new color-contrast violations (${allViolations.length} total, all allowlisted).`,
    )
}
