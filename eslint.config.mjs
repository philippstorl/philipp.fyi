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

    // Hook rules for the sole React island. Not the plugin's full
    // recommended-latest -- its React-Compiler rules flagged real code before.
    {
        files: ['**/*.tsx'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },

    // <!-- --> ships to prod HTML; {/* */} compiles away. Combined with the
    // style rule below -- flat config replaces, not merges, a rule per file match.
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

    // Blocks inline style attrs, uncovered by the hash-only style-src CSP
    // (CLAUDE.md). .tsx-only -- .astro case covered above; keep both in sync.
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
        // netlify dev/build's local output -- bundled deps here aren't
        // source and fail this repo's own lint rules.
        ignores: ['dist/**', '.astro/**', 'node_modules/**', '.netlify/**'],
    },
)
