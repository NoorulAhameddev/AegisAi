#!/usr/bin/env node
/**
 * Test Validation Script
 * Validates that test infrastructure is properly configured
 */

const fs = require("fs");
const path = require("path");

const testDir = path.join(__dirname, "apps/web/src/__tests__");
const errors = [];
const warnings = [];
const successes = [];

console.log("\n=== Testing Infrastructure Validation ===\n");

// 1. Check test files exist
console.log("✓ Checking test files...");
const testFiles = [];
function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
        testFiles.push(fullPath);
      }
    });
  } catch (err) {
    errors.push(`Failed to read directory ${dir}: ${err.message}`);
  }
}

walkDir(testDir);

if (testFiles.length > 0) {
  successes.push(`Found ${testFiles.length} test files`);
  testFiles.forEach((f) => console.log(`  📄 ${path.relative(__dirname, f)}`));
} else {
  errors.push("No test files found in " + testDir);
}

// 2. Check jest configuration
console.log("\n✓ Checking Jest configuration...");
const jestConfigPath = path.join(__dirname, "apps/web/jest.config.ts");
if (fs.existsSync(jestConfigPath)) {
  successes.push("jest.config.ts exists");
  console.log("  ✓ jest.config.ts found");
} else {
  errors.push("jest.config.ts not found");
}

// 3. Check test setup files
console.log("\n✓ Checking test setup files...");
const setupFiles = [
  path.join(__dirname, "config/jest.setup.ts"),
  path.join(__dirname, "apps/web/src/__tests__/setup.ts"),
];

setupFiles.forEach((f) => {
  if (fs.existsSync(f)) {
    successes.push(`Setup file: ${path.basename(f)}`);
    console.log(`  ✓ ${path.basename(f)} found`);
  } else {
    warnings.push(`Setup file not found: ${f}`);
  }
});

// 4. Validate mock configuration
console.log("\n✓ Checking mock configuration...");
const jestSetup = fs.readFileSync(
  path.join(__dirname, "config/jest.setup.ts"),
  "utf8",
);

const expectedMocks = [
  "@aws-sdk/client-kms",
  "@aws-sdk/client-s3",
  "@aws-sdk/s3-request-presigner",
  "@/lib/vector-db-provider",
];

expectedMocks.forEach((mock) => {
  if (jestSetup.includes(`jest.mock('${mock}'`)) {
    successes.push(`Mock found: ${mock}`);
    console.log(`  ✓ ${mock} mocked`);
  } else {
    warnings.push(`Mock not found: ${mock}`);
  }
});

// 5. Check package.json test script
console.log("\n✓ Checking package.json...");
const pkgPath = path.join(__dirname, "apps/web/package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

if (pkg.scripts && pkg.scripts.test) {
  successes.push(`Test script configured: ${pkg.scripts.test}`);
  console.log(`  ✓ Test script: npm test`);
} else {
  errors.push("No test script in package.json");
}

// Summary
console.log("\n=== Summary ===\n");
console.log(`✓ Successes: ${successes.length}`);
successes.forEach((s) => console.log(`  • ${s}`));

if (warnings.length > 0) {
  console.log(`⚠ Warnings: ${warnings.length}`);
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}

if (errors.length > 0) {
  console.log(`✗ Errors: ${errors.length}`);
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log("\n✓ All validation checks passed! Tests should be runnable.\n");
  console.log("Next steps:");
  console.log("  1. cd apps/web");
  console.log("  2. npm test");
  console.log("\n");
  process.exit(0);
}
