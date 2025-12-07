import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import importSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
    { ignores: ['dist', 'src/graphql.tsx'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: { ...globals.browser, NodeJS: true }
        },
        plugins: {
            'simple-import-sort': importSort
        },
        rules: {
            'no-unused-vars': 'off',
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'no-empty': 'error',
            'no-undef': 'error',
            'block-scoped-var': 'error',
            eqeqeq: 'error',
            'no-else-return': 'error',
            'linebreak-style': ['error', 'unix'],
            'no-console': 'warn',
            'no-fallthrough': 'error',
            'no-octal': 'error',
            semi: ['error', 'always'],
            quotes: ['error', 'single', { avoidEscape: true }],
            'comma-dangle': ['error', 'never'],
            curly: 'error'
        }
    }
);
