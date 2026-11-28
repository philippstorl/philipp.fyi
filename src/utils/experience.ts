import { career } from '@/data/career'
import { getEntrySpan, monthEndDate, monthStartDate } from '@/utils/career'

const CAREER_START_DATE = new Date('2010-02-01')

// UTC getters -- local-time would shift the date in negative-UTC-offset zones.
function yearsBetween(start: Date, end: Date): number {
    let years = end.getUTCFullYear() - start.getUTCFullYear()
    const anniversaryPassed =
        end.getUTCMonth() > start.getUTCMonth() ||
        (end.getUTCMonth() === start.getUTCMonth() &&
            end.getUTCDate() >= start.getUTCDate())
    if (!anniversaryPassed) years -= 1
    return years
}

export function getYearsOfExperience(now: Date = new Date()): number {
    return yearsBetween(CAREER_START_DATE, now)
}

// Tenure has concluded: fixed dates from career.ts, not `now`, so it can't keep growing.
export function getStaffbaseTenureYears(): number {
    const entry = career.find((e) => e.company === 'Staffbase')
    if (!entry) throw new Error('career.ts has no Staffbase entry')
    const { start, end } = getEntrySpan(entry)
    if (!end) throw new Error('Staffbase tenure needs an end date')
    return yearsBetween(monthStartDate(start), monthEndDate(end))
}
