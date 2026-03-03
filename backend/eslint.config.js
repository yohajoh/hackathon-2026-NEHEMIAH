import js from "@eslint/js";
import globals from "globals";
import nodePlugin from "eslint-plugin-n";
import prettierConfig from "eslint-config-prettier";

export default [
  // 1. Global Ignores (replaces .eslintignore)
  {
    ignores: ["src/generated/**", "node_modules/**"],
  },

  // 2. Main Configuration
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      n: nodePlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...nodePlugin.configs["recommended-module"].rules,

      // Custom Logic Errors
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
      "prefer-const": "error",
      "no-undef": "error",

      // Node-specific checks
      "n/no-missing-import": "error",
      "n/no-process-exit": "error",

      ...prettierConfig.rules, // Must be last to override
    },
  },
];
