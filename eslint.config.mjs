import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
    { ignores: ['dist', 'coverage'] },
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx,mjs}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            // JSX usage isn't tracked without eslint-plugin-react, so allow capitalized names.
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
        },
    },
    {
        files: ['**/*.test.{js,jsx}', 'src/setupTests.js'],
        languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    },
    {
        files: ['scripts/**', 'vite.config.js'],
        languageOptions: { globals: { ...globals.node } },
    },
];
