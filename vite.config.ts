import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: process.env.CAPACITOR_BUILD === 'true' ? './' : '/',
    plugins: [
      react(),
      isProd && sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: 'hidden',
      minify: 'esbuild',
      // P0-11 (auditoria 2026-05-25): Vite gera modulepreload automaticamente para
      // todo chunk em manualChunks. Isso anulava o defer documentado em App.tsx
      // (Sentry/charts/dnd/calendar carregando no first paint, ~1MB+ desnecessário).
      // Excluímos os chunks pesados que devem ficar fora do critical path —
      // eles continuam disponíveis on-demand via dynamic import.
      modulePreload: {
        resolveDependencies: (_filename, deps) =>
          deps.filter(d =>
            !d.includes('sentry') &&
            !d.includes('charts') &&
            !d.includes('dnd') &&
            !d.includes('calendar') &&
            !d.includes('flow')
          ),
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            'ui-dialog': ['@radix-ui/react-dialog'],
            'ui-select': ['@radix-ui/react-select'],
            'ui-tabs': ['@radix-ui/react-tabs'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
            sentry: ['@sentry/react'],
            charts: ['recharts'],
            calendar: ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/list'],
            dnd: ['@hello-pangea/dnd'],
            flow: ['@xyflow/react'],
          },
        }
      },
      chunkSizeWarningLimit: 800
    },

    server: {
      port: 8081,
      host: true
    },

    preview: {
      port: 4173
    }
  };
});
