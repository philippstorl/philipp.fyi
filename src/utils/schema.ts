import { hero } from '@/data/hero'
import { SITE_NAME } from '@/data/site'

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
        name: SITE_NAME,
        // The clause before the first comma is the actual job title; the
        // rest of hero.subheading is descriptive copy, not a jobTitle.
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

// A bare year is valid reduced-precision ISO 8601; an en-dash range isn't a
// date at all. Use the range's earlier (fixed) year, not the later one —
// some case studies use an open-ended range that still ends in the current
// year, and datePublished shouldn't silently creep forward as that range
// gets bumped each year. Exported so work/[slug].astro can derive the same
// value for og:article:published_time rather than re-deriving it.
export function extractSchemaYear(year: string): string {
    const parts = year.split('–')
    return parts[0]
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
        author: { '@type': 'Person', name: SITE_NAME },
        url: params.url,
        ...(params.image ? { image: params.image } : {}),
    }
}
