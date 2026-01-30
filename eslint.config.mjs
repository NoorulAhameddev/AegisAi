import js from "@eslint/js";

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
      // Skip TypeScript for now (ESLint TS plugin not configured)
      "**/*.ts",
      "**/*.tsx",
    ],
  },
  // Base recommended rules
  js.configs.recommended,
  // App source rules and globals for browser/Next environment (JS only)
  {
    files: ["src/**/*.{js,jsx}"],
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
      // Handled by typed code paths; avoid false positives in browser code
      "no-undef": "off",
    },
  },
  // Node-specific files (e.g., config/scripts)
  {
    files: ["next.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
      },
    },
  },
  // CSS-in-JS patterns: suppress inline style warnings for dynamic values
  // (gradients, widths, etc. that cannot be expressed via Tailwind)
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      "@next/next/no-inline-styles": "off",
    },
  },
];

export default eslintConfig;
