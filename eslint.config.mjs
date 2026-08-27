import { defineConfig } from 'eslint/config'
import eslintPluginAstro from 'eslint-plugin-astro'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default defineConfig(
    ...tseslint.configs.recommended,

    // Also sets up astro-eslint-parser automatically.
    ...eslintPluginAstro.configs['flat/recommended'],

    // jsx-a11y catches missing alt text, bad ARIA usage, label/input
    // mismatches, and other issues that directly affect Lighthouse scores.
    {
        plugins: { 'jsx-a11y': jsxA11y },
        rules: { ...jsxA11y.configs.recommended.rules },
    },

    // Hook-correctness rules for the sole React island (ContactForm.tsx).
    // Deliberately not the plugin's full `recommended-latest` — its wider
    // React-Compiler rule set flagged real working code in the since-removed
    // ThemeToggle island.
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
    // JS-style comments are compiled away entirely. Combined with the
    // style-attribute restriction below in one config object: ESLint flat
    // config replaces (doesn't merge) a rule key when two objects match the
    // same file, so keeping these as separate .astro-matching blocks would
    // silently drop one of them.
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
        // rules). Anyone who runs `netlify dev` locally hits a lint failure
        // without this ignore.
        ignores: ['dist/**', '.astro/**', 'node_modules/**', '.netlify/**'],
    },
)
