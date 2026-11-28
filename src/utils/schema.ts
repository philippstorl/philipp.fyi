import { CURRENT_EMPLOYER } from '@/data/employer'
import { JOB_TITLE, hero } from '@/data/hero'
import { SITE_NAME } from '@/data/site'

export interface PersonSchema {
    '@context': 'https://schema.org'
    '@type': 'Person'
    name: string
    jobTitle: string
    worksFor: { '@type': 'Organization'; name: string; url: string }
    url: string
    sameAs: string[]
}

/** Person schema for the homepage — name, jobTitle, worksFor, and sameAs (social profile URLs). */
export function buildPersonSchema(url: string): PersonSchema {
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: SITE_NAME,
        jobTitle: JOB_TITLE,
        worksFor: {
            '@type': 'Organization',
            name: CURRENT_EMPLOYER.name,
            url: CURRENT_EMPLOYER.url,
        },
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
    sourceOrganization: { '@type': 'Organization'; name: string }
    url: string
    image?: string
}

export interface CreativeWorkSchemaParams {
    title: string
    description: string
    /** A 4-digit year or an en-dash year range, as validated by content.config.ts's work schema. */
    year: string
    company: string
    url: string
    image?: string
}

// Earlier year of an en-dash range, not the later one -- an open-ended
// range shouldn't make datePublished creep forward as it gets bumped yearly.
export function extractSchemaYear(year: string): string {
    return year.split('–')[0]! // split() always returns at least one element
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
        sourceOrganization: { '@type': 'Organization', name: params.company },
        url: params.url,
        ...(params.image ? { image: params.image } : {}),
    }
}

export interface BlogPostingSchema {
    '@context': 'https://schema.org'
    '@type': 'BlogPosting'
    headline: string
    description: string
    datePublished: string
    author: { '@type': 'Person'; name: string }
    url: string
    image: string
}

export interface BlogPostingSchemaParams {
    title: string
    description: string
    date: Date
    url: string
    image: string
}

/** BlogPosting schema for a blog post page. */
export function buildBlogPostingSchema(
    params: BlogPostingSchemaParams,
): BlogPostingSchema {
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: params.title,
        description: params.description,
        datePublished: params.date.toISOString(),
        author: { '@type': 'Person', name: SITE_NAME },
        url: params.url,
        image: params.image,
    }
}
