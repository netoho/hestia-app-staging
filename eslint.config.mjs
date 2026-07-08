// Flat ESLint config (guardrails #129). Baseline: typescript-eslint recommended
// with `no-explicit-any` at WARN — #137 flips it to error per-path once the
// T-track burns the count down. CI does not run ESLint yet; the tsc ratchet
// (scripts/tsc-ratchet.ts) is the enforced type gate.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/prisma/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'tests/e2e/**', // dead scaffold; replaced by the fresh harness (#161)
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
