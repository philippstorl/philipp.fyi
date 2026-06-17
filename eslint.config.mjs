import eslintPluginAstro from 'eslint-plugin-astro'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    // ── TypeScript ──────────────────────────────────────────────────────────
    // Type-aware lint rules for .ts and .tsx files.
    ...tseslint.configs.recommended,

    // ── Astro ────────────────────────────────────────────────────────────────
    // Astro-specific rules including correct .astro component usage and
    // front-matter patterns. Also sets up astro-eslint-parser automatically.
    ...eslintPluginAstro.configs['flat/recommended'],

    // ── Accessibility ────────────────────────────────────────────────────────
    // jsx-a11y catches missing alt text, bad ARIA usage, label/input
    // mismatches, and other issues that directly affect Lighthouse scores.
    {
        plugins: { 'jsx-a11y': jsxA11y },
        rules: { ...jsxA11y.configs.recommended.rules },
    },

    // ── Ignored paths ────────────────────────────────────────────────────────
    {
        ignores: ['dist/**', '.astro/**', 'node_modules/**'],
    },
)
