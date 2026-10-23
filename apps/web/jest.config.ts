import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // Add more setup options before each test is run
  setupFilesAfterEnv: [
    "<rootDir>/../../config/jest.setup.ts",
    "<rootDir>/src/__tests__/setup.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@prisma/client$": "<rootDir>/../../node_modules/@prisma/client/default.js",
  },
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.ts",
    "<rootDir>/src/__tests__/**/*.test.tsx",
  ],
  testTimeout: 20000,
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
    "!src/__tests__/**",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  rootDir: "./",
  coverageThreshold: {
    global: {
      lines: 10,
      branches: 10,
      functions: 10,
      statements: 10,
    },
  },
};

export default createJestConfig(config);
