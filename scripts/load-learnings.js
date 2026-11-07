import fs from 'fs'

// Claude Code saves an additionalContext over 10,000 chars (JS string length) to a
// file and injects only a ~2 KB preview, so stay well under it.
const MAX_CHARS = 9000

const path = process.argv[2] ?? 'LEARNINGS.md'
const HEADER =
    'From LEARNINGS.md (bounded digest, newest days first, each in file order):'
const POINTER = 'Older entries: read LEARNINGS.md'

// Top-level `- ` bullets, each with any indented continuation lines.
function splitBullets(lines) {
    const bullets = []
    for (const line of lines) {
        if (line.startsWith('- ') || bullets.length === 0) bullets.push(line)
        else bullets[bullets.length - 1] += `\n${line}`
    }
    return bullets.map((b) => b.trimEnd()).filter(Boolean)
}

// A follow-up is meaningless without the entry above it, so they're kept or dropped together.
const FOLLOW_UP =
    /^- (\*\*)?(Second )?(Follow-up|Same session|Correction to the entry above)\b/i

function groupFollowUps(bullets) {
    const groups = []
    for (const bullet of bullets) {
        if (FOLLOW_UP.test(bullet) && groups.length > 0)
            groups.at(-1).push(bullet)
        else groups.push([bullet])
    }
    return groups
}

function parse(content) {
    const preamble = []
    const sections = new Map()
    let current = null
    for (const line of content.split(/\r?\n/)) {
        const h2 = /^## (.+)$/.exec(line)
        if (h2?.[1]) {
            current = []
            sections.set(h2[1].trim(), current)
        } else if (current) current.push(line)
        else preamble.push(line)
    }

    const days = []
    for (const line of sections.get('Log') ?? []) {
        const h3 = /^### (.+)$/.exec(line)
        if (h3?.[1]) days.push({ heading: h3[1].trim(), lines: [] })
        else days.at(-1)?.lines.push(line)
    }
    // The file is mostly newest-first, but not strictly.
    days.sort((a, b) => b.heading.localeCompare(a.heading))

    return {
        preamble: preamble.join('\n').trim(),
        openQuestions: splitBullets(sections.get('Open questions') ?? []),
        // Prefer each day's newest (bottom) entries when the budget runs out,
        // but render in file order: entries refer to "the entry above".
        entries: days.flatMap(({ heading, lines }, day) =>
            groupFollowUps(splitBullets(lines))
                .map((texts, index) => ({
                    heading,
                    texts,
                    day,
                    index,
                    size: texts.reduce((n, text) => n + text.length + 1, 0),
                }))
                .reverse(),
        ),
    }
}

// Greedily keeps whole items, first to last, skipping any that don't fit.
function takeWhole(items, cost, budget) {
    const kept = []
    for (const item of items) {
        if (cost(item) <= budget) {
            kept.push(item)
            budget -= cost(item)
        }
    }
    return { kept, left: budget }
}

function buildDigest(content) {
    const { preamble, openQuestions, entries } = parse(content)
    const count = (list) => list.reduce((n, e) => n + e.texts.length, 0)
    const total = count(entries)
    const questionsNote = (n) =>
        `\n- (${n} more open questions in LEARNINGS.md)`
    const pointer = (n) => `\n\n${POINTER} (${n} of ${total} not shown).`
    let budget =
        MAX_CHARS -
        `${HEADER}\n\n`.length -
        '\n\n## Open questions\n'.length -
        questionsNote(openQuestions.length).length -
        '\n\n## Log'.length -
        pointer(total).length

    const intro =
        preamble.length > budget
            ? `${preamble.slice(0, budget - 1)}…`
            : preamble
    budget -= intro.length

    // Open questions are also appended at the bottom, so prefer the newest.
    const questionPick = takeWhole(
        [...openQuestions].reverse(),
        (q) => q.length + 1,
        budget,
    )
    const questions = openQuestions.filter((q) => questionPick.kept.includes(q))
    // Charges every entry for a day heading, so the total can only come in under budget.
    const shown = takeWhole(
        entries,
        (e) => e.heading.length + 6 + e.size,
        questionPick.left,
    ).kept.sort((a, b) => a.day - b.day || a.index - b.index)

    let out = `${HEADER}\n\n${intro}`
    if (openQuestions.length > 0) {
        out += `\n\n## Open questions\n${questions.map((q) => `\n${q}`).join('')}`
        if (questions.length < openQuestions.length)
            out += questionsNote(openQuestions.length - questions.length)
    }
    if (entries.length > 0) out += '\n\n## Log'
    let lastHeading = null
    for (const { heading, texts } of shown) {
        if (heading !== lastHeading) out += `\n\n### ${heading}\n`
        out += texts.map((text) => `\n${text}`).join('')
        lastHeading = heading
    }
    const hidden = total - count(shown)
    if (hidden > 0) out += pointer(hidden)
    return out
}

if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8').trim()
    if (content) {
        console.log(
            JSON.stringify({
                hookSpecificOutput: {
                    hookEventName: 'SessionStart',
                    additionalContext: buildDigest(content),
                },
            }),
        )
    }
}
