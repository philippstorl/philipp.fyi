const CAREER_START_DATE = new Date('2010-02-01')

// Staffbase tenure has already concluded (see brand-evolution.mdx), so this
// is computed between two fixed dates rather than against `now` — it must
// not keep growing in builds made after the last day.
const STAFFBASE_START_DATE = new Date('2018-03-01')
const STAFFBASE_END_DATE = new Date('2026-06-30')

// Both dates are compared via UTC getters — start/end are parsed from
// date-only ISO strings (UTC midnight), so local-time getters would shift
// the effective date by up to a day in negative-UTC-offset timezones.
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

export function getStaffbaseTenureYears(): number {
    return yearsBetween(STAFFBASE_START_DATE, STAFFBASE_END_DATE)
}
