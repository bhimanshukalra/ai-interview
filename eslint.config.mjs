import stylistic from '@stylistic/eslint-plugin';
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const webFiles = ['apps/web/**/*.{js,jsx,mjs,ts,tsx}'];
const nextConfig = nextVitals.map((config) => {
  if ('ignores' in config) {
    return config;
  }

  return {
    ...config,
    files: webFiles,
    settings: {
      ...config.settings,
      next: {
        ...config.settings?.next,
        rootDir: 'apps/web/',
      },
    },
  };
});

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/node_modules/**',
      'apps/api/.wrangler/**',
      'apps/api/drizzle/**',
      'apps/web/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextConfig,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@next/next/no-html-link-for-pages': 'off',
      'func-names': ['error', 'as-needed'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/api/scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
);
