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
    // JS-style comments are compiled away entirely. See issue #64.
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
            ],
        },
    },

    {
        ignores: ['dist/**', '.astro/**', 'node_modules/**'],
    },
)
