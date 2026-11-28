import type { CareerEntry } from '@/data/career'

interface YearMonth {
    year: number
    month: number
}

function parseYearMonth(value: string): YearMonth {
    const match = /^(\d{4})-(\d{2})$/.exec(value)
    const month = Number(match?.[2])
    if (!match?.[1] || month < 1 || month > 12) {
        throw new Error(`Expected a YYYY-MM date, got "${value}"`)
    }
    return { year: Number(match[1]), month }
}

function toYearMonth(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthStartDate(value: string): Date {
    const { year, month } = parseYearMonth(value)
    return new Date(Date.UTC(year, month - 1, 1))
}

export function monthEndDate(value: string): Date {
    const { year, month } = parseYearMonth(value)
    return new Date(Date.UTC(year, month, 0))
}

export function formatYearMonth(value: string): string {
    return monthStartDate(value).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

/** Counts both the start and end month, like LinkedIn (Oct–Dec is 3 months). */
export function formatDuration(
    start: string,
    end: string | undefined,
    now: Date = new Date(),
): string {
    const from = parseYearMonth(start)
    const to = parseYearMonth(end ?? toYearMonth(now))
    const months = (to.year - from.year) * 12 + (to.month - from.month) + 1
    if (months < 1)
        throw new Error(`${start} to ${end ?? 'now'} is under a month`)
    const years = Math.floor(months / 12)
    const rest = months % 12
    const parts = []
    if (years) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
    if (rest) parts.push(`${rest} ${rest === 1 ? 'month' : 'months'}`)
    return parts.join(' ')
}

export function getEntrySpan(entry: CareerEntry): {
    start: string
    end: string | undefined
} {
    const starts = entry.roles.map((role) => role.start).sort()
    const ends = entry.roles.map((role) => role.end)
    const start = starts[0]
    if (!start) throw new Error(`${entry.company} has no roles`)
    const end = ends.includes(undefined)
        ? undefined
        : (ends as string[]).sort().at(-1)
    return { start, end }
}
