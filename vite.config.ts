import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// 🚀 PADRÃO ELON MUSK: Configuração segura para produção
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  return {
    // 🚀 SERVIDOR SEGURO - TESLA/SPACEX GRADE
    server: {
      host: isDev ? "localhost" : "0.0.0.0", // Seguro em dev, flexível em prod
      port: parseInt(process.env.VITE_PORT || "8080"),
      strictPort: true,
      https: isProd ? {
        // HTTPS obrigatório em produção
        key: process.env.HTTPS_KEY_PATH,
        cert: process.env.HTTPS_CERT_PATH,
      } : false,
      headers: {
        // 🚀 HEADERS DE SEGURANÇA CRÍTICOS
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': isDev
          ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: ws:;"
          : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    },

    // 🚀 PLUGINS OTIMIZADOS
    plugins: [
      react({
        // Configuração padrão do React SWC
        jsxRuntime: 'automatic'
      }),
      isDev && componentTagger(),

      // ✅ Sentry source maps upload (apenas em produção)
      isProd && sentryVitePlugin({
        org: process.env.SENTRY_ORG || "jurify",
        project: process.env.SENTRY_PROJECT || "jurify-frontend",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: './dist/**',
          ignore: ['node_modules'],
          filesToDeleteAfterUpload: ['./dist/**/*.map']
        },
        telemetry: false,
        silent: false,
      }),
    ].filter(Boolean),

    // 🚀 RESOLUÇÃO E ALIASES
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@contexts": path.resolve(__dirname, "./src/contexts"),
      },
    },

    // 🚀 BUILD OTIMIZADO PARA PRODUÇÃO
    build: {
      target: 'es2020',
      minify: isProd ? 'esbuild' : false,
      // ✅ Source maps para Sentry (hidden em prod para não expor ao público)
      sourcemap: isProd ? 'hidden' : true,
      rollupOptions: {
        output: {
          // Code splitting inteligente
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
            supabase: ['@supabase/supabase-js'],
            utils: ['date-fns', 'clsx', 'tailwind-merge']
          },
          // Nomes de arquivo com hash para cache busting
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // 🚀 OTIMIZAÇÕES DE PERFORMANCE
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.info'] : []
        }
      },
      // Limite de chunk size
      chunkSizeWarningLimit: 1000
    },

    // 🚀 OTIMIZAÇÕES DE DESENVOLVIMENTO
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query'
      ]
    },

    // 🚀 VARIÁVEIS DE AMBIENTE SEGURAS
    define: {
      __DEV__: isDev,
      __PROD__: isProd,
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
    },

    // 🚀 PREVIEW PARA TESTES DE PRODUÇÃO
    preview: {
      port: parseInt(process.env.PREVIEW_PORT || "4173"),
      strictPort: true,
      https: {
        key: process.env.HTTPS_KEY_PATH,
        cert: process.env.HTTPS_CERT_PATH,
      }
    }
  };
});
