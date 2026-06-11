import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    pool: 'forks',
    minForks: 2,
    maxForks: 4,
    css: false,
    testTimeout: 10000,
    deps: {
      optimizer: {
        web: {
          include: [
            '@testing-library/jest-dom',
            '@testing-library/react',
            '@testing-library/user-event',
            '@radix-ui/*',
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
            'date-fns',
            'recharts',
            'lucide-react',
            '@tanstack/react-query',
          ],
        },
      },
    },
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
        'src/features/conexoes/connectionDetailsTypes.ts', // Types only
        'src/hooks/useEntityCRUD.ts', // Generic CRUD factory — E2E
        'src/hooks/useConexoes.ts', // 300 lines, WhatsApp connections CRUD — E2E
        'src/hooks/useDashboardMetricsFast.ts', // 233 lines, realtime dashboard — E2E
      ],
      thresholds: {
        lines: 50,
        statements: 50,
        functions: 40,
        branches: 40,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**', // Playwright E2E tests
      'tests/**', // Old test structure
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
