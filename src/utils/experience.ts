const CAREER_START_DATE = new Date('2010-02-01')

// Tenure has concluded -- fixed dates, not `now`, so it can't keep growing.
const STAFFBASE_START_DATE = new Date('2018-03-01')
const STAFFBASE_END_DATE = new Date('2026-06-30')

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

export function getStaffbaseTenureYears(): number {
    return yearsBetween(STAFFBASE_START_DATE, STAFFBASE_END_DATE)
}
