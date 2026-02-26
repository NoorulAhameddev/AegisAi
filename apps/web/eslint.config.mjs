import js from "@eslint/js";
import tseslint from "typescript-eslint";

const eslintConfig = [
  // Ignore build outputs and non-source folders
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "data/**",
      "uploads/**",
      "public/**",
      "mobile/**",
      "src/__tests__/**",
      // script utilities are Node-targeted and not part of app linting
      "scripts/**",
    ],
  },
  // Base recommended rules
  js.configs.recommended,
  // TypeScript recommended rules
  ...tseslint.configs.recommended,
  // App source rules and globals for browser/Next environment
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        localStorage: "readonly",
        FormData: "readonly",
        AbortController: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-undef": "off",
    },
  },
  // Node-specific files (e.g., config/scripts)
  {
    files: ["**/*.config.js", "next.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
  // CSS-in-JS patterns: suppress inline style warnings for dynamic values
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      "@next/next/no-inline-styles": "off",
    },
  },
];

export default eslintConfig;
