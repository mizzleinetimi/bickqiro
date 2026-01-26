import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 30000,
    environmentMatchGlobs: [
      // Use jsdom for component tests
      ['tests/components/**', 'jsdom'],
      ['tests/auth/components.test.tsx', 'jsdom'],
    ],
    setupFiles: ['tests/components/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
