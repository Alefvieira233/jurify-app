import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      react()
    ],

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
      sourcemap: false,
      minify: 'esbuild',
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
          },
        }
      },
      chunkSizeWarningLimit: 800
    },

    server: {
      port: 8080,
      host: true
    },

    preview: {
      port: 4173
    }
  };
});
