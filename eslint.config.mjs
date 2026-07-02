import eslintPluginAstro from 'eslint-plugin-astro'
import jsxA11y from 'eslint-plugin-jsx-a11y'
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
