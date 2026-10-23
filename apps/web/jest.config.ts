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
  },
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.ts",
    "<rootDir>/src/__tests__/**/*.test.tsx",
  ],
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
      lines: 60,
      branches: 50,
      functions: 60,
      statements: 60,
    },
  },
};

export default createJestConfig(config);
