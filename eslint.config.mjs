import eslintPluginAstro from 'eslint-plugin-astro'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    ...tseslint.configs.recommended,

    // Also sets up astro-eslint-parser automatically.
    ...eslintPluginAstro.configs['flat/recommended'],

    // jsx-a11y catches missing alt text, bad ARIA usage, label/input
    // mismatches, and other issues that directly affect Lighthouse scores.
    {
        plugins: { 'jsx-a11y': jsxA11y },
        rules: { ...jsxA11y.configs.recommended.rules },
    },

    // Catches rules-of-hooks violations and missing-dependency bugs in the
    // two React islands (ContactForm.tsx, ThemeToggle.tsx) — nothing else
    // in this repo lints hook usage. Scoped to .tsx since Astro components
    // don't use React hooks. Deliberately only these two rules, not the
    // plugin's full `recommended-latest` config — v7 bundles a much larger,
    // React-Compiler-oriented rule set (purity, set-state-in-effect, etc.)
    // that immediately flags real, working code in ThemeToggle.tsx and
    // would need broader behavioral changes to satisfy, well beyond what
    // this issue asked for.
    {
        files: ['**/*.tsx'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },

    // Astro compiles <!-- --> HTML comments straight into the production
    // build (they ship to every visitor's "View Source"), but {/* */}
    // JS-style comments are compiled away entirely (issue #64). Combined
    // with the style-attribute restriction below in one config object:
    // ESLint flat config replaces (doesn't merge) a rule key when two
    // objects match the same file, so keeping these as separate .astro-
    // matching blocks silently dropped this one (issue #179).
    {
        files: ['**/*.astro'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'AstroHTMLComment',
                    message:
                        'HTML comments (<!-- -->) render into the production build. Use {/* */} instead.',
                },
                {
                    selector: "JSXAttribute[name.name='style']",
                    message:
                        'Inline style attributes bypass the hash-only style-src CSP. Use a Tailwind arbitrary-value/arbitrary-property class instead.',
                },
            ],
        },
    },

    // security.csp (astro.config.mjs) generates a hash-only style-src with
    // no 'unsafe-inline' carve-out, which only covers <style> elements, not
    // inline style="..."/style={{...}} attributes (see CLAUDE.md's CSP
    // section) — this rule stops a new one from silently creeping back in.
    // .tsx-only here since the .astro case is covered above — the
    // selector/message pair is duplicated between the two blocks (flat
    // config can't share a rule entry across files arrays), keep them in
    // sync if either changes.
    {
        files: ['**/*.tsx'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "JSXAttribute[name.name='style']",
                    message:
                        'Inline style attributes bypass the hash-only style-src CSP. Use a Tailwind arbitrary-value/arbitrary-property class instead.',
                },
            ],
        },
    },

    {
        // .netlify is `netlify dev`/`netlify build`'s local output — esbuild
        // bundles each function's full dependency tree into
        // .netlify/functions-serve/, which lint has no business scanning
        // (it's not source, and its bundled deps fail this repo's own
        // rules). Not an issue until this repo had its first Netlify
        // Function (issue #146); anyone who's run `netlify dev` locally
        // hits a lint failure without this.
        ignores: ['dist/**', '.astro/**', 'node_modules/**', '.netlify/**'],
    },
)
