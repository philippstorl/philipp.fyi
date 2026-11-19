import path from 'path'
import { fileURLToPath } from 'url'
import { parseAllHeaders } from '@netlify/headers-parser'

const netlifyConfigPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'netlify.toml',
)

// Netlify's own parser, since TOML scopes keys by table, not indentation: a
// stray [[headers]] line re-scopes every key below it.
/** @returns {Promise<import('@netlify/headers-parser').Header[]>} */
export async function loadHeaderRules() {
    const { headers, errors } = await parseAllHeaders({
        headersFiles: [],
        netlifyConfigPath,
        configHeaders: [],
        minimal: false,
    })
    if (errors.length > 0) {
        throw new Error(errors.map((error) => error.message).join('\n'))
    }
    // A missing file parses to no rules, not an error.
    if (headers.length === 0) {
        throw new Error(`No [[headers]] rules found in ${netlifyConfigPath}`)
    }
    return /** @type {import('@netlify/headers-parser').Header[]} */ (headers)
}

/**
 * The rules that set a header, matched case-insensitively.
 * @param {import('@netlify/headers-parser').Header[]} rules
 * @param {string} name
 */
export function rulesSetting(rules, name) {
    return rules.filter((rule) =>
        Object.keys(rule.values).some(
            (key) => key.toLowerCase() === name.toLowerCase(),
        ),
    )
}

/**
 * Every matching rule's value for each header on urlPath, keyed by lowercase
 * name, so two rules setting the same header show up as two values.
 * @param {import('@netlify/headers-parser').Header[]} rules
 * @param {string} urlPath
 * @returns {Record<string, string[]>}
 */
export function headersForPath(rules, urlPath) {
    /** @type {Record<string, string[]>} */
    const resolved = {}
    for (const rule of rules) {
        if (!rule.forRegExp.test(urlPath)) continue
        for (const [name, value] of Object.entries(rule.values)) {
            const key = name.toLowerCase()
            resolved[key] = [...(resolved[key] ?? []), value]
        }
    }
    return resolved
}
