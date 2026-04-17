import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "android",
      "ios",
      "icons",
      ".claude/**",
      ".aiox-core/**",
      ".antigravity/**",
      ".codex/**",
      ".cursor/**",
      ".gemini/**",
      ".github/**",
      "meu-projeto/**",
      "public/sw.js",
      "supabase/functions/**",
      "tests/**",
      "e2e/**",
      "scripts/**",
      "apply-test-data.js",
      "test-supabase-connection.js",
      "*.config.{js,ts}",
      "vite.config.ts",
      "vitest.config.ts",
      "tailwind.config.ts",
      "src/lib/multiagents/examples/**",
      "src/integrations/supabase/types.ts",
      "src/**/__tests__/**",
      "src/tests/**",
      "src/scripts/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/**/__tests__/**",
      "src/tests/**",
      "src/scripts/**",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "src/lib/multiagents/examples/**",
    ],
    languageOptions: {
      ecmaVersion: 2020,
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/**/__tests__/**",
      "src/tests/**",
      "src/scripts/**",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "src/lib/multiagents/examples/**",
      "src/integrations/supabase/types.ts",
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // TypeScript strict rules - habilitadas gradualmente
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-explicit-any": "warn", // CRÍTICO: Detectar uso de 'any'
      "no-restricted-imports": ["error", {
        "paths": [{
          "name": "@/integrations/supabase/client",
          "importNames": ["supabaseUntyped"],
          "message": "supabaseUntyped is deprecated. Use 'supabase' (typed) instead."
        }]
      }],
      // Block deep cross-feature imports — use barrel exports for module boundaries.
      // Set to 'warn' (not 'error') because pre-existing violations are documented;
      // migration is gradual. Promote to 'error' once violations are resolved.
      "@typescript-eslint/no-restricted-imports": ["warn", {
        "patterns": [{
          "group": ["@/features/*/components/**", "@/features/*/hooks/**", "@/features/*/api/**"],
          "message": "Use barrel export from @/features/<feature-name> instead of deep imports."
        }]
      }],
      // Block `.select('*')` — list explicit columns to keep types accurate and
      // avoid accidentally shipping sensitive fields to the client. Legitimate
      // exceptions (e.g. LGPD full-export, backup-restore) must disable this
      // rule with an inline comment explaining why.
      "no-restricted-syntax": ["error", {
        "selector": "CallExpression[callee.property.name='select'] > Literal[value='*']",
        "message": "Do not use .select('*'). Specify columns explicitly. If you have a legitimate need (LGPD export, backup), add an eslint-disable-next-line comment explaining why."
      }],
      "@typescript-eslint/no-unsafe-assignment": "off", // Gradual
      "@typescript-eslint/no-unsafe-member-access": "off", // Gradual
      "@typescript-eslint/no-unsafe-call": "off", // Gradual
      "@typescript-eslint/no-unsafe-return": "off", // Gradual
      "@typescript-eslint/no-unsafe-argument": "off", // Gradual
    },
  },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  }
);
