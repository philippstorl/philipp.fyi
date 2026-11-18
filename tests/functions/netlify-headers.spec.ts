import { expect, test } from '@playwright/test'
import { STRICT_TRANSPORT_SECURITY } from '../../netlify/functions/_shared/hsts'
import {
    headersForPath,
    loadHeaderRules,
    rulesSetting,
} from '../../scripts/netlify-headers.mjs'

// Real paths with the Cache-Control each should get (undefined: none), so a
// rule that loses its value fails too, not just one that gains a second.
const EXPECTED_CACHE_CONTROL: Record<string, string | undefined> = {
    '/': undefined,
    '/work/brand-evolution/': undefined,
    '/404': undefined,
    '/.well-known/security.txt': undefined,
    '/_astro/x.js': 'public, max-age=31536000, immutable',
    '/_astro/x.png': 'public, max-age=31536000, immutable',
    '/og/home.png': 'public, max-age=86400',
    '/favicon.svg': 'public, max-age=86400',
    '/favicon.ico': 'public, max-age=86400',
    '/apple-touch-icon.png': 'public, max-age=86400',
    '/robots.txt': 'public, max-age=3600',
    '/sitemap-index.xml': 'public, max-age=3600',
    '/rss.xml': 'public, max-age=3600',
}

// Hardcoded, not read from the /* rule: a misplaced [[headers]] line moves
// headers out of that rule, which a derived list would follow.
const SITE_WIDE_HEADERS = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'cross-origin-opener-policy',
    'x-xss-protection',
    'content-security-policy',
    'reporting-endpoints',
]

const rules = await loadHeaderRules()

// The real paths plus one sample per rule, so a new rule is covered too.
const samplePaths = [
    ...new Set([
        ...Object.keys(EXPECTED_CACHE_CONTROL),
        ...rules.map(
            (rule) =>
                '/' +
                rule.for
                    .replace(/^\//, '')
                    .replace(/\*/g, 'x')
                    .replace(/:[^/]+/g, 'x'),
        ),
    ]),
]
const resolved = new Map(
    samplePaths.map((path) => [path, headersForPath(rules, path)]),
)
const rootHeaders = headersForPath(rules, '/')

test('each site-wide header is set once, by the /* rule', () => {
    for (const name of SITE_WIDE_HEADERS) {
        expect(
            rulesSetting(rules, name).map((rule) => rule.for),
            name,
        ).toEqual(['/*'])
    }
})

test('the root path gets the expected HSTS and CSP', () => {
    expect(rootHeaders['strict-transport-security']).toEqual([
        STRICT_TRANSPORT_SECURITY,
    ])
    const csp = rootHeaders['content-security-policy'] ?? []
    expect(csp).toHaveLength(1)
    const directives = new Map(
        (csp[0] ?? '').split(';').map((directive) => {
            const [name = '', ...sources] = directive.trim().split(/\s+/)
            return [name, sources.join(' ')]
        }),
    )
    expect(directives.get('default-src')).toBe("'self'")
    expect(directives.get('object-src')).toBe("'none'")
    expect(directives.get('frame-ancestors')).toBe("'none'")
    expect(directives.get('base-uri')).toBe("'self'")
    expect(directives.get('report-uri')).toBe('/.netlify/functions/csp-report')
})

for (const path of samplePaths) {
    test(`${path} gets every site-wide security header once`, () => {
        const headers = resolved.get(path) ?? {}
        for (const name of SITE_WIDE_HEADERS) {
            expect(headers[name], name).toHaveLength(1)
            expect(headers[name], name).toEqual(rootHeaders[name])
        }
    })

    test(`${path} gets at most one Cache-Control`, () => {
        const values = resolved.get(path)?.['cache-control'] ?? []
        expect(values.length, values.join(' | ')).toBeLessThanOrEqual(1)
    })
}

for (const [path, expected] of Object.entries(EXPECTED_CACHE_CONTROL)) {
    test(`${path} gets the expected Cache-Control`, () => {
        expect(resolved.get(path)?.['cache-control']).toEqual(
            expected === undefined ? undefined : [expected],
        )
    })
}
