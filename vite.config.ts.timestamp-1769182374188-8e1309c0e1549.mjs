// vite.config.ts
import { defineConfig } from "file:///E:/Jurify/advo-ai-hub-main%20(1)/advo-ai-hub-main/node_modules/vite/dist/node/index.js";
import react from "file:///E:/Jurify/advo-ai-hub-main%20(1)/advo-ai-hub-main/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///E:/Jurify/advo-ai-hub-main%20(1)/advo-ai-hub-main/node_modules/lovable-tagger/dist/index.js";
import { sentryVitePlugin } from "file:///E:/Jurify/advo-ai-hub-main%20(1)/advo-ai-hub-main/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
var __vite_injected_original_dirname = "E:\\Jurify\\advo-ai-hub-main (1)\\advo-ai-hub-main";
var vite_config_default = defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const isProd = mode === "production";
  return {
    // 🚀 SERVIDOR SEGURO - TESLA/SPACEX GRADE
    server: {
      host: isDev ? "localhost" : "0.0.0.0",
      // Seguro em dev, flexível em prod
      port: parseInt(process.env.VITE_PORT || "8080"),
      strictPort: true,
      https: isProd ? {
        // HTTPS obrigatório em produção
        key: process.env.HTTPS_KEY_PATH,
        cert: process.env.HTTPS_CERT_PATH
      } : false,
      headers: {
        // 🚀 HEADERS DE SEGURANÇA CRÍTICOS
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": isDev ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss: ws:;" : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https:;",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      }
    },
    // 🚀 PLUGINS OTIMIZADOS
    plugins: [
      react({
        // Configuração padrão do React SWC
        jsxRuntime: "automatic"
      }),
      isDev && componentTagger(),
      // ✅ Sentry source maps upload (apenas em produção)
      isProd && sentryVitePlugin({
        org: process.env.SENTRY_ORG || "jurify",
        project: process.env.SENTRY_PROJECT || "jurify-frontend",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: "./dist/**",
          ignore: ["node_modules"],
          filesToDeleteAfterUpload: ["./dist/**/*.map"]
        },
        telemetry: false,
        silent: false
      })
    ].filter(Boolean),
    // 🚀 RESOLUÇÃO E ALIASES
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
        "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
        "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
        "@contexts": path.resolve(__vite_injected_original_dirname, "./src/contexts")
      }
    },
    // 🚀 BUILD OTIMIZADO PARA PRODUÇÃO
    build: {
      target: "es2020",
      minify: isProd ? "esbuild" : false,
      // ✅ Source maps para Sentry (hidden em prod para não expor ao público)
      sourcemap: isProd ? "hidden" : true,
      rollupOptions: {
        output: {
          // Code splitting inteligente
          manualChunks: {
            vendor: ["react", "react-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-select"],
            supabase: ["@supabase/supabase-js"],
            utils: ["date-fns", "clsx", "tailwind-merge"]
          },
          // Nomes de arquivo com hash para cache busting
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      },
      // 🚀 OTIMIZAÇÕES DE PERFORMANCE
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ["console.log", "console.info"] : []
        }
      },
      // Limite de chunk size
      chunkSizeWarningLimit: 1e3
    },
    // 🚀 OTIMIZAÇÕES DE DESENVOLVIMENTO
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@supabase/supabase-js",
        "@tanstack/react-query"
      ]
    },
    // 🚀 VARIÁVEIS DE AMBIENTE SEGURAS
    define: {
      __DEV__: isDev,
      __PROD__: isProd,
      __VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0")
    },
    // 🚀 PREVIEW PARA TESTES DE PRODUÇÃO
    preview: {
      port: parseInt(process.env.PREVIEW_PORT || "4173"),
      strictPort: true,
      https: {
        key: process.env.HTTPS_KEY_PATH,
        cert: process.env.HTTPS_CERT_PATH
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxKdXJpZnlcXFxcYWR2by1haS1odWItbWFpbiAoMSlcXFxcYWR2by1haS1odWItbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcSnVyaWZ5XFxcXGFkdm8tYWktaHViLW1haW4gKDEpXFxcXGFkdm8tYWktaHViLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0p1cmlmeS9hZHZvLWFpLWh1Yi1tYWluJTIwKDEpL2Fkdm8tYWktaHViLW1haW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IHNlbnRyeVZpdGVQbHVnaW4gfSBmcm9tIFwiQHNlbnRyeS92aXRlLXBsdWdpblwiO1xuXG4vLyBcdUQ4M0RcdURFODAgUEFEUlx1MDBDM08gRUxPTiBNVVNLOiBDb25maWd1cmFcdTAwRTdcdTAwRTNvIHNlZ3VyYSBwYXJhIHByb2R1XHUwMEU3XHUwMEUzb1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBpc0RldiA9IG1vZGUgPT09ICdkZXZlbG9wbWVudCc7XG4gIGNvbnN0IGlzUHJvZCA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJztcblxuICByZXR1cm4ge1xuICAgIC8vIFx1RDgzRFx1REU4MCBTRVJWSURPUiBTRUdVUk8gLSBURVNMQS9TUEFDRVggR1JBREVcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIGhvc3Q6IGlzRGV2ID8gXCJsb2NhbGhvc3RcIiA6IFwiMC4wLjAuMFwiLCAvLyBTZWd1cm8gZW0gZGV2LCBmbGV4XHUwMEVEdmVsIGVtIHByb2RcbiAgICAgIHBvcnQ6IHBhcnNlSW50KHByb2Nlc3MuZW52LlZJVEVfUE9SVCB8fCBcIjgwODBcIiksXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgICAgaHR0cHM6IGlzUHJvZCA/IHtcbiAgICAgICAgLy8gSFRUUFMgb2JyaWdhdFx1MDBGM3JpbyBlbSBwcm9kdVx1MDBFN1x1MDBFM29cbiAgICAgICAga2V5OiBwcm9jZXNzLmVudi5IVFRQU19LRVlfUEFUSCxcbiAgICAgICAgY2VydDogcHJvY2Vzcy5lbnYuSFRUUFNfQ0VSVF9QQVRILFxuICAgICAgfSA6IGZhbHNlLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAvLyBcdUQ4M0RcdURFODAgSEVBREVSUyBERSBTRUdVUkFOXHUwMEM3QSBDUlx1MDBDRFRJQ09TXG4gICAgICAgICdYLUZyYW1lLU9wdGlvbnMnOiAnREVOWScsXG4gICAgICAgICdYLUNvbnRlbnQtVHlwZS1PcHRpb25zJzogJ25vc25pZmYnLFxuICAgICAgICAnWC1YU1MtUHJvdGVjdGlvbic6ICcxOyBtb2RlPWJsb2NrJyxcbiAgICAgICAgJ1N0cmljdC1UcmFuc3BvcnQtU2VjdXJpdHknOiAnbWF4LWFnZT0zMTUzNjAwMDsgaW5jbHVkZVN1YkRvbWFpbnMnLFxuICAgICAgICAnQ29udGVudC1TZWN1cml0eS1Qb2xpY3knOiBpc0RldlxuICAgICAgICAgID8gXCJkZWZhdWx0LXNyYyAnc2VsZic7IHNjcmlwdC1zcmMgJ3NlbGYnICd1bnNhZmUtZXZhbCcgJ3Vuc2FmZS1pbmxpbmUnOyBzdHlsZS1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJzsgaW1nLXNyYyAnc2VsZicgZGF0YTogaHR0cHM6IGJsb2I6OyBmb250LXNyYyAnc2VsZicgZGF0YTogaHR0cHM6OyBjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6IHdzczogd3M6O1wiXG4gICAgICAgICAgOiBcImRlZmF1bHQtc3JjICdzZWxmJzsgc2NyaXB0LXNyYyAnc2VsZic7IHN0eWxlLXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnOyBpbWctc3JjICdzZWxmJyBkYXRhOiBodHRwczogYmxvYjo7IGZvbnQtc3JjICdzZWxmJyBkYXRhOiBodHRwczo7IGNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczo7XCIsXG4gICAgICAgICdSZWZlcnJlci1Qb2xpY3knOiAnc3RyaWN0LW9yaWdpbi13aGVuLWNyb3NzLW9yaWdpbidcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gXHVEODNEXHVERTgwIFBMVUdJTlMgT1RJTUlaQURPU1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KHtcbiAgICAgICAgLy8gQ29uZmlndXJhXHUwMEU3XHUwMEUzbyBwYWRyXHUwMEUzbyBkbyBSZWFjdCBTV0NcbiAgICAgICAganN4UnVudGltZTogJ2F1dG9tYXRpYydcbiAgICAgIH0pLFxuICAgICAgaXNEZXYgJiYgY29tcG9uZW50VGFnZ2VyKCksXG5cbiAgICAgIC8vIFx1MjcwNSBTZW50cnkgc291cmNlIG1hcHMgdXBsb2FkIChhcGVuYXMgZW0gcHJvZHVcdTAwRTdcdTAwRTNvKVxuICAgICAgaXNQcm9kICYmIHNlbnRyeVZpdGVQbHVnaW4oe1xuICAgICAgICBvcmc6IHByb2Nlc3MuZW52LlNFTlRSWV9PUkcgfHwgXCJqdXJpZnlcIixcbiAgICAgICAgcHJvamVjdDogcHJvY2Vzcy5lbnYuU0VOVFJZX1BST0pFQ1QgfHwgXCJqdXJpZnktZnJvbnRlbmRcIixcbiAgICAgICAgYXV0aFRva2VuOiBwcm9jZXNzLmVudi5TRU5UUllfQVVUSF9UT0tFTixcbiAgICAgICAgc291cmNlbWFwczoge1xuICAgICAgICAgIGFzc2V0czogJy4vZGlzdC8qKicsXG4gICAgICAgICAgaWdub3JlOiBbJ25vZGVfbW9kdWxlcyddLFxuICAgICAgICAgIGZpbGVzVG9EZWxldGVBZnRlclVwbG9hZDogWycuL2Rpc3QvKiovKi5tYXAnXVxuICAgICAgICB9LFxuICAgICAgICB0ZWxlbWV0cnk6IGZhbHNlLFxuICAgICAgICBzaWxlbnQ6IGZhbHNlLFxuICAgICAgfSksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG5cbiAgICAvLyBcdUQ4M0RcdURFODAgUkVTT0xVXHUwMEM3XHUwMEMzTyBFIEFMSUFTRVNcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgICAgXCJAY29tcG9uZW50c1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL2NvbXBvbmVudHNcIiksXG4gICAgICAgIFwiQGhvb2tzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvaG9va3NcIiksXG4gICAgICAgIFwiQHV0aWxzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvdXRpbHNcIiksXG4gICAgICAgIFwiQGNvbnRleHRzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvY29udGV4dHNcIiksXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBcdUQ4M0RcdURFODAgQlVJTEQgT1RJTUlaQURPIFBBUkEgUFJPRFVcdTAwQzdcdTAwQzNPXG4gICAgYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgICBtaW5pZnk6IGlzUHJvZCA/ICdlc2J1aWxkJyA6IGZhbHNlLFxuICAgICAgLy8gXHUyNzA1IFNvdXJjZSBtYXBzIHBhcmEgU2VudHJ5IChoaWRkZW4gZW0gcHJvZCBwYXJhIG5cdTAwRTNvIGV4cG9yIGFvIHBcdTAwRkFibGljbylcbiAgICAgIHNvdXJjZW1hcDogaXNQcm9kID8gJ2hpZGRlbicgOiB0cnVlLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAvLyBDb2RlIHNwbGl0dGluZyBpbnRlbGlnZW50ZVxuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICAgdWk6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0J10sXG4gICAgICAgICAgICBzdXBhYmFzZTogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXSxcbiAgICAgICAgICAgIHV0aWxzOiBbJ2RhdGUtZm5zJywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgLy8gTm9tZXMgZGUgYXJxdWl2byBjb20gaGFzaCBwYXJhIGNhY2hlIGJ1c3RpbmdcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLltleHRdJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gXHVEODNEXHVERTgwIE9USU1JWkFcdTAwQzdcdTAwRDVFUyBERSBQRVJGT1JNQU5DRVxuICAgICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgIGRyb3BfY29uc29sZTogaXNQcm9kLFxuICAgICAgICAgIGRyb3BfZGVidWdnZXI6IGlzUHJvZCxcbiAgICAgICAgICBwdXJlX2Z1bmNzOiBpc1Byb2QgPyBbJ2NvbnNvbGUubG9nJywgJ2NvbnNvbGUuaW5mbyddIDogW11cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIExpbWl0ZSBkZSBjaHVuayBzaXplXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDBcbiAgICB9LFxuXG4gICAgLy8gXHVEODNEXHVERTgwIE9USU1JWkFcdTAwQzdcdTAwRDVFUyBERSBERVNFTlZPTFZJTUVOVE9cbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgJ3JlYWN0JyxcbiAgICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAgICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLFxuICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J1xuICAgICAgXVxuICAgIH0sXG5cbiAgICAvLyBcdUQ4M0RcdURFODAgVkFSSVx1MDBDMVZFSVMgREUgQU1CSUVOVEUgU0VHVVJBU1xuICAgIGRlZmluZToge1xuICAgICAgX19ERVZfXzogaXNEZXYsXG4gICAgICBfX1BST0RfXzogaXNQcm9kLFxuICAgICAgX19WRVJTSU9OX186IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX3ZlcnNpb24gfHwgJzEuMC4wJylcbiAgICB9LFxuXG4gICAgLy8gXHVEODNEXHVERTgwIFBSRVZJRVcgUEFSQSBURVNURVMgREUgUFJPRFVcdTAwQzdcdTAwQzNPXG4gICAgcHJldmlldzoge1xuICAgICAgcG9ydDogcGFyc2VJbnQocHJvY2Vzcy5lbnYuUFJFVklFV19QT1JUIHx8IFwiNDE3M1wiKSxcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgICBodHRwczoge1xuICAgICAgICBrZXk6IHByb2Nlc3MuZW52LkhUVFBTX0tFWV9QQVRILFxuICAgICAgICBjZXJ0OiBwcm9jZXNzLmVudi5IVFRQU19DRVJUX1BBVEgsXG4gICAgICB9XG4gICAgfVxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlVLFNBQVMsb0JBQW9CO0FBQ3RXLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyx3QkFBd0I7QUFKakMsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxRQUFRLFNBQVM7QUFDdkIsUUFBTSxTQUFTLFNBQVM7QUFFeEIsU0FBTztBQUFBO0FBQUEsSUFFTCxRQUFRO0FBQUEsTUFDTixNQUFNLFFBQVEsY0FBYztBQUFBO0FBQUEsTUFDNUIsTUFBTSxTQUFTLFFBQVEsSUFBSSxhQUFhLE1BQU07QUFBQSxNQUM5QyxZQUFZO0FBQUEsTUFDWixPQUFPLFNBQVM7QUFBQTtBQUFBLFFBRWQsS0FBSyxRQUFRLElBQUk7QUFBQSxRQUNqQixNQUFNLFFBQVEsSUFBSTtBQUFBLE1BQ3BCLElBQUk7QUFBQSxNQUNKLFNBQVM7QUFBQTtBQUFBLFFBRVAsbUJBQW1CO0FBQUEsUUFDbkIsMEJBQTBCO0FBQUEsUUFDMUIsb0JBQW9CO0FBQUEsUUFDcEIsNkJBQTZCO0FBQUEsUUFDN0IsMkJBQTJCLFFBQ3ZCLGdOQUNBO0FBQUEsUUFDSixtQkFBbUI7QUFBQSxNQUNyQjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBO0FBQUEsUUFFSixZQUFZO0FBQUEsTUFDZCxDQUFDO0FBQUEsTUFDRCxTQUFTLGdCQUFnQjtBQUFBO0FBQUEsTUFHekIsVUFBVSxpQkFBaUI7QUFBQSxRQUN6QixLQUFLLFFBQVEsSUFBSSxjQUFjO0FBQUEsUUFDL0IsU0FBUyxRQUFRLElBQUksa0JBQWtCO0FBQUEsUUFDdkMsV0FBVyxRQUFRLElBQUk7QUFBQSxRQUN2QixZQUFZO0FBQUEsVUFDVixRQUFRO0FBQUEsVUFDUixRQUFRLENBQUMsY0FBYztBQUFBLFVBQ3ZCLDBCQUEwQixDQUFDLGlCQUFpQjtBQUFBLFFBQzlDO0FBQUEsUUFDQSxXQUFXO0FBQUEsUUFDWCxRQUFRO0FBQUEsTUFDVixDQUFDO0FBQUEsSUFDSCxFQUFFLE9BQU8sT0FBTztBQUFBO0FBQUEsSUFHaEIsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLFFBQ3BDLGVBQWUsS0FBSyxRQUFRLGtDQUFXLGtCQUFrQjtBQUFBLFFBQ3pELFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxRQUMvQyxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsUUFDL0MsYUFBYSxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsTUFDdkQ7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFFBQVEsU0FBUyxZQUFZO0FBQUE7QUFBQSxNQUU3QixXQUFXLFNBQVMsV0FBVztBQUFBLE1BQy9CLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQTtBQUFBLFVBRU4sY0FBYztBQUFBLFlBQ1osUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLFlBQzdCLElBQUksQ0FBQywwQkFBMEIsd0JBQXdCO0FBQUEsWUFDdkQsVUFBVSxDQUFDLHVCQUF1QjtBQUFBLFlBQ2xDLE9BQU8sQ0FBQyxZQUFZLFFBQVEsZ0JBQWdCO0FBQUEsVUFDOUM7QUFBQTtBQUFBLFVBRUEsZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsUUFDbEI7QUFBQSxNQUNGO0FBQUE7QUFBQSxNQUVBLGVBQWU7QUFBQSxRQUNiLFVBQVU7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLGVBQWU7QUFBQSxVQUNmLFlBQVksU0FBUyxDQUFDLGVBQWUsY0FBYyxJQUFJLENBQUM7QUFBQSxRQUMxRDtBQUFBLE1BQ0Y7QUFBQTtBQUFBLE1BRUEsdUJBQXVCO0FBQUEsSUFDekI7QUFBQTtBQUFBLElBR0EsY0FBYztBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxRQUFRO0FBQUEsTUFDTixTQUFTO0FBQUEsTUFDVCxVQUFVO0FBQUEsTUFDVixhQUFhLEtBQUssVUFBVSxRQUFRLElBQUksdUJBQXVCLE9BQU87QUFBQSxJQUN4RTtBQUFBO0FBQUEsSUFHQSxTQUFTO0FBQUEsTUFDUCxNQUFNLFNBQVMsUUFBUSxJQUFJLGdCQUFnQixNQUFNO0FBQUEsTUFDakQsWUFBWTtBQUFBLE1BQ1osT0FBTztBQUFBLFFBQ0wsS0FBSyxRQUFRLElBQUk7QUFBQSxRQUNqQixNQUFNLFFBQVEsSUFBSTtBQUFBLE1BQ3BCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
