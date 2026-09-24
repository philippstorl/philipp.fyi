import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedResultFileNames } from './contrast-pages.mjs'

// Aggregates axe-core contrast results into a report (see CLAUDE.md).
// Report-only on violations, but exits 1 if the scan itself is incomplete.

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

function loadReports(files) {
    return files.map((file) =>
        JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8')),
    )
}

function loadViolations(reports) {
    const violations = []
    for (const report of reports) {
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

// axe's `incomplete` nodes (e.g. an unparseable color, text over an image)
// were never checked, so surface them instead of reading as a clean pass.
function loadUnchecked(reports) {
    const unchecked = []
    for (const report of reports) {
        for (const rule of report.incomplete ?? []) {
            for (const node of rule.nodes) {
                const check = [...(node.any ?? []), ...(node.all ?? [])].find(
                    (c) => c.data?.messageKey,
                )
                unchecked.push({
                    page: report.page,
                    theme: report.theme,
                    selector: node.target.join(', '),
                    reason: check?.data?.messageKey ?? 'unknown',
                })
            }
        }
    }
    return unchecked
}

function buildSummary(newViolations, newUnchecked) {
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
    } else {
        lines.push('No new color-contrast violations found.')
    }
    if (newUnchecked.length > 0) {
        lines.push(
            '',
            `${newUnchecked.length} node${newUnchecked.length === 1 ? '' : 's'} axe could not check (\`incomplete\`), not already in \`contrast-allowlist.json\`:`,
            '',
            '| Page | Theme | Selector | Reason |',
            '| --- | --- | --- | --- |',
        )
        for (const u of newUnchecked) {
            lines.push(
                `| \`${u.page}\` | ${u.theme} | \`${u.selector}\` | \`${u.reason}\` |`,
            )
        }
    }
    if (newViolations.length > 0 || newUnchecked.length > 0) {
        lines.push(
            '',
            'This check is report-only and does not block merging. If a finding is intentional, add it to `contrast-allowlist.json` with a reason.',
        )
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
const reports = loadReports(resultFiles)
const allViolations = loadViolations(reports)
const newViolations = allViolations.filter((v) => !isAllowlisted(allowlist, v))
const allUnchecked = loadUnchecked(reports)
const newUnchecked = allUnchecked.filter((u) => !isAllowlisted(allowlist, u))

fs.mkdirSync(resultsDir, { recursive: true })
fs.writeFileSync(summaryPath, buildSummary(newViolations, newUnchecked))
fs.writeFileSync(
    statusPath,
    JSON.stringify(
        {
            hasNew: newViolations.length > 0 || newUnchecked.length > 0,
            newCount: newViolations.length,
            totalCount: allViolations.length,
            newUncheckedCount: newUnchecked.length,
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
if (newUnchecked.length > 0) {
    console.log(
        `${newUnchecked.length} new node(s) axe could not check (${allUnchecked.length} total). See ${path.relative(root, summaryPath)}.`,
    )
}
