/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-plugin-prettier');

module.exports = [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        plugins: {
            prettier,
        },
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
        },
        rules: {
            indent: ['error', 4, {SwitchCase: 1}],
            semi: ['error', 'always'],
            'arrow-parens': ['error', 'as-needed'],
            'object-curly-spacing': ['error', 'never'],
            'array-bracket-spacing': ['error', 'never'],
            'prettier/prettier': 'error',
            'no-console': ['error', {allow: ['warn', 'error']}],
            'no-use-before-define': 'error',
            eqeqeq: 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
        },
    },
];
