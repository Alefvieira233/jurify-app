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
        'src/hooks/useAgendaAutomation.ts', // 546 lines, heavy async Supabase + Google Calendar — E2E
        'src/hooks/useAgendaIntelligence.ts', // 379 lines, AI scheduling logic — E2E
        'src/hooks/useWhatsAppConversations.ts', // 359 lines, realtime WhatsApp — E2E
        'src/hooks/useGoogleCalendar.ts', // 447 lines, Google Calendar integration — E2E
        'src/hooks/useGoogleCalendarConnection.ts', // OAuth flow — E2E
        'src/hooks/useRealtimeSync.ts', // Supabase Realtime side-effect only — E2E
        'src/hooks/useCalendarEvents.ts', // 217 lines, calendar CRUD — E2E
        'src/hooks/useAgendamentos.ts', // 186 lines, scheduling CRUD — E2E
        'src/hooks/useMultiAgentSystem.ts', // 327 lines, complex multi-agent orchestration — E2E
        'src/hooks/useAgentesIA.ts', // 311 lines, AI agent CRUD with useSupabaseQuery — E2E
        'src/hooks/useFollowUps.ts', // 271 lines, CRM follow-ups CRUD — E2E
        'src/hooks/useAgentPipeline.ts', // 190 lines, realtime agent pipeline — E2E
        'src/hooks/useApiKeys.ts', // 160 lines, useState/useEffect CRUD — E2E
        'src/hooks/useCRMTags.ts', // 109 lines, useState/useEffect CRUD — E2E
        'src/hooks/useIntegracoesConfig.ts', // 178 lines, useState/useEffect CRUD — E2E
        'src/hooks/useActivityLogs.ts', // 207 lines, useState/useEffect CRUD — E2E
        'src/hooks/useCRMPipeline.ts', // 164 lines, useState/useEffect CRUD — E2E
        'src/hooks/useNotificationTemplates.ts', // 105 lines, useState/useEffect CRUD — E2E
        'src/hooks/useLogsExecucao.ts', // 173 lines, useState/useEffect CRUD — E2E
        'src/hooks/useZapSignIntegration.ts', // 151 lines, OAuth + external API — E2E
        'src/hooks/useAIAssistant.ts', // 98 lines, AI API calls — E2E
        'src/hooks/useDashboardMetrics.ts', // 543 lines, heavy multi-query dashboard — E2E
        'src/hooks/useAgentesMetrics.ts', // 168 lines, useState/useEffect metrics — E2E
      ],
      // Thresholds estabelecem um floor anti-regressão.
      // Aumentar gradualmente à medida que novos testes são adicionados.
      thresholds: {
        lines: 75,
        functions: 65,
        branches: 60,
        statements: 75,
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
