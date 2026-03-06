import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'src/integrations/**', // Supabase auto-generated
        'dist/**',
        'src/lib/multiagents/agents/**', // Agent files are 95%+ prompt string literals
        'src/lib/multiagents/core/BaseAgent.ts', // Abstract base with heavy AI/RAG deps
        'src/components/forms/**', // Complex form components tested via E2E
        'src/pages/**', // Page components tested via E2E
      ],
      // Thresholds estabelecem um floor anti-regressão.
      // Aumentar gradualmente à medida que novos testes são adicionados.
      thresholds: {
        lines: 50,
        functions: 40,
        branches: 35,
        statements: 50,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**', // Playwright E2E tests
      'tests/**', // Old test structure
      'src/__tests__/security.test.ts', // Legacy Jest file - needs migration
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
