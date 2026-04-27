import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import pluginQuery from "@tanstack/eslint-plugin-query";
import { createRequire } from "module";

// Load custom CJS rule via createRequire (eslint.config.js is ESM, the rule
// file uses CommonJS because typical custom ESLint rules are authored as CJS
// modules — see eslint-rules/no-supabase-from-outside-hooks.cjs).
const require = createRequire(import.meta.url);
const noSupabaseFromOutsideHooks = require("./eslint-rules/no-supabase-from-outside-hooks.cjs");

export default tseslint.config(
  { ignores: ["dist", "eslint-rules"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...pluginQuery.configs["flat/recommended"],
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      lever: {
        rules: {
          "no-supabase-from-outside-hooks": noSupabaseFromOutsideHooks,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "lever/no-supabase-from-outside-hooks": "error",
    },
  },
);
