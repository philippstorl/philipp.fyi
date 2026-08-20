import { hero } from '@/data/hero'

// No single data source currently stores the person's plain display name —
// Footer.astro hardcodes the same string in its copyright line. Duplicating
// it here (rather than threading a new field through hero.ts/about.ts) keeps
// this file's only real "pull from existing data" job focused on the two
// values that genuinely exist as structured data elsewhere: the social
// profile URLs (hero.links) used below for `sameAs`.
const PERSON_NAME = 'Philipp Storl'

export interface PersonSchema {
    '@context': 'https://schema.org'
    '@type': 'Person'
    name: string
    jobTitle: string
    url: string
    sameAs: string[]
}

/** Person schema for the homepage — name, jobTitle, and sameAs (social profile URLs). */
export function buildPersonSchema(url: string): PersonSchema {
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: PERSON_NAME,
        // hero.subheading reads "Principal Web Developer, full-stack, with a
        // designer's eye." — the clause before the first comma is the actual
        // job title; the rest is descriptive copy that doesn't belong in a
        // schema.org jobTitle field.
        jobTitle: hero.subheading.split(',')[0].trim(),
        url,
        sameAs: hero.links.map((link) => link.href),
    }
}

export interface CreativeWorkSchema {
    '@context': 'https://schema.org'
    '@type': 'CreativeWork'
    headline: string
    name: string
    description: string
    datePublished: string
    author: { '@type': 'Person'; name: string }
    url: string
    image?: string
}

export interface CreativeWorkSchemaParams {
    title: string
    description: string
    /** A 4-digit year or an en-dash year range, as validated by content.config.ts's work schema. */
    year: string
    url: string
    image?: string
}

// schema.org's Date datatype (which datePublished uses) requires an ISO 8601
// value — a bare 4-digit year ("2024") is valid ISO 8601 reduced precision,
// but an en-dash range ("2018–2026", the shape content.config.ts's work
// schema allows for multi-year case studies) is not a date at all. Since
// datePublished is a single point in time, the range's later year is used —
// the point at which the described work was most current — rather than
// fabricating a day/month or asserting the range itself as a date.
function extractSchemaYear(year: string): string {
    const parts = year.split('–')
    return parts[parts.length - 1]
}

/** CreativeWork schema for a case study page — used over Article since these are portfolio project write-ups, not news/blog content. */
export function buildCreativeWorkSchema(
    params: CreativeWorkSchemaParams,
): CreativeWorkSchema {
    return {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        headline: params.title,
        name: params.title,
        description: params.description,
        datePublished: extractSchemaYear(params.year),
        author: { '@type': 'Person', name: PERSON_NAME },
        url: params.url,
        ...(params.image ? { image: params.image } : {}),
    }
}
