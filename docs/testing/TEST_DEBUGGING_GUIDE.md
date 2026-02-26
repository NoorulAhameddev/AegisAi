# Test Debugging & Fixing Guide

## Quick Reference: Fixing Remaining Test Failures

### Current Status

- **256 total tests** discovered
- **134 passing** (52.3%)
- **92 failing** (mostly mock issues)
- **30 skipped** (intentionally excluded)

---

## Common Failure Patterns & Solutions

### ❌ Error Type 1: "Expected 500 but received 200"

**Root Cause**: Route handler mock returning wrong status code  
**Affected Tests**: api.chat.delete.test.ts, several route tests

**Fix Pattern**:

```typescript
// ❌ WRONG - Plain object response
const response = mockResponse();
expect(response.status).toBe(200); // undefined!

// ✅ CORRECT - Response object with all methods
const response = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  headers: new Map(),
};
```

**Commands to Find**:

```bash
npm test -- --listTests | grep "route\|api"
npm test -- --verbose 2>&1 | grep "Expected 500"
```

---

### ❌ Error Type 2: "Cannot mock X before module import"

**Root Cause**: jest.mock() called after import, or wrong mock path  
**Affected Tests**: Security, database, worker tests

**Fix Pattern**:

```typescript
// ❌ WRONG - Mock after import
import { someFunc } from "@/lib/helpers"; // Import first
jest.mock("@/lib/helpers"); // Then mock? Too late!

// ✅ CORRECT - Mock before import
jest.mock("@/lib/helpers");
import { someFunc } from "@/lib/helpers"; // Import after
```

**Commands to Find**:

```bash
npm test -- --verbose 2>&1 | grep "Cannot mock"
grep -r "jest.mock" apps/web/src/__tests__ | grep -A2 "^import"
```

---

### ❌ Error Type 3: "ReferenceError: X is not defined"

**Root Cause**: Missing mock setup or incorrect mock path

**Fix Pattern**:

```typescript
// ❌ WRONG
jest.mock("@/services/memory"); // But files are in src/services/ai/

// ✅ CORRECT
jest.mock("@/services/ai/memory-extractor"); // Exact path
jest.mock("@/lib/rag-retrieval");
```

**Find Exact Paths**:

```bash
find apps/web/src -type f -name "*.ts" | grep -E "memory|rag|security"
```

---

### ❌ Error Type 4: "prisma.X.mockResolvedValue is not a function"

**Root Cause**: Prisma mock not set up properly in test file

**Fix Pattern**:

```typescript
// ❌ WRONG - No mock setup
test("find user", async () => {
  const user = await prisma.user.findFirst();
});

// ✅ CORRECT - Mock before test
beforeEach(() => {
  prisma.user.findFirst = jest.fn().mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
  });
});

test("find user", async () => {
  const user = await prisma.user.findFirst();
  expect(user.id).toBe("user-1");
});
```

**Add to failing database tests**:

```bash
npm test -- --verbose 2>&1 | grep "prisma"
```

---

### ❌ Error Type 5: "setTimeout/setInterval not cleared"

**Root Cause**: Test not cleaning up timers or jobs

**Fix Pattern**:

```typescript
// ✅ Add cleanup
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Or use
jest.useFakeTimers();
// ... test code ...
jest.runAllTimers();
jest.useRealTimers();
```

---

## Step-by-Step Debugging Process

### Step 1: Identify Failing Test File

```bash
npm test -- --listTests | grep -E "test|spec"
npm test -- --testNamePattern="test name here" --verbose
```

**Output**: Shows which specific test assertion fails

### Step 2: Review Error Message

```bash
npm test -- failing-test.ts 2>&1 | head -50
```

**Look for**:

- Line number of failing assertion
- Expected vs Actual value
- Stack trace showing which mock failed

### Step 3: Check Mock Configuration

```bash
# Find all jest.mock() calls in file
grep -n "jest.mock" apps/web/src/__tests__/failing-test.ts

# Verify mock paths exist
find apps/web/src -path "*/__tests__" -prune -o -name "memory.ts" -print
```

### Step 4: Fix Mock Path or Setup

```typescript
// Example: If test can't find @/services/auth/jwt
// Find correct import path:
find apps/web/src -name "*jwt*" -o -name "*auth*" | grep -v test
// Then update mock:
jest.mock('@/services/auth/auth'); // Correct path
```

### Step 5: Verify with Single Test Run

```bash
npm test -- specific-test.ts --testNamePattern="specific test"
```

---

## Batch Fixing Strategy

### Fix Category 1: Response Mocks (Fastest)

**Estimated**: 15 tests

```bash
npm test -- --verbose 2>&1 | grep -E "(expect|received)" | head -20
```

**Solution**:

```typescript
// In setup.ts, improve createMockResponse
export const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  headers: new Map([["content-type", "application/json"]]),
  ok: true,
});
```

---

### Fix Category 2: Prisma Mocks (Medium)

**Estimated**: 25 tests

**Solution** - Create helper:

```typescript
// src/__tests__/lib/prisma-mocks.ts
export function setupPrismaMocks() {
  return {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chat: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}
```

Then use in tests:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  const mocks = setupPrismaMocks();
  Object.entries(mocks).forEach(([model, methods]) => {
    Object.entries(methods).forEach(([method, fn]) => {
      (prisma as any)[model as any][method] = fn;
    });
  });
});
```

---

### Fix Category 3: BullMQ/Queue Mocks (Hardest)

**Estimated**: 20 tests

**Solution**:

```typescript
// src/__tests__/lib/bullmq-mocks.ts - Already created!
export const createMockJob = (overrides = {}) => ({
  id: "job-123",
  name: "test-job",
  data: {},
  state: "completed",
  progress: 100,
  attempts: 0,
  returnvalue: { success: true },
  ...overrides,
});

export const createMockQueue = () => ({
  add: jest.fn().mockResolvedValue(createMockJob()),
  process: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
});
```

---

## Test Execution Commands

### Run Tests by Category

```bash
# Auth tests only
npm test -- api.auth

# Chat tests only
npm test -- api.chat

# Security tests only
npm test -- security

# Worker tests only
npm test -- workers

# Integration tests only
npm test -- integration

# Run with coverage
npm test -- --coverage

# Find which tests are slowest
npm test -- --detectOpenHandles --logHeapUsage
```

---

## Fixing Specific Failing Tests

### Test: security/jailbreaks.test.ts

```bash
# Find the issue
npm test -- jailbreaks --verbose

# Likely cause: checkIntent mock not set up
# Solution: Add to test file
jest.mock('@/lib/security');
const { checkIntent } = require('@/lib/security');
beforeEach(() => {
  checkIntent.mockReturnValue(false);
});
```

---

### Test: lib/response.test.ts

```bash
# Likely issue: Response status method chain broken
# Solution: Check createMockResponse() returns proper object
expect(response.status(200).json(data)).toBeDefined();

// Add to setup.ts:
status: jest.fn().mockReturnValue({
  json: jest.fn().mockReturnValue(/* response */)
})
```

---

### Test: api.chat creation

```bash
# Likely issue: Job queue not returning properly formatted job
# Solution: Mock chatQueue.add() with full job response
chatQueue.add.mockResolvedValue({
  id: 'job-1',
  data: { chatId: 'chat-1' },
  state: 'waiting',
});
```

---

## Monitoring Fixes

### After Each Fix:

```bash
npm test 2>&1 | tail -5
```

**Expected progression**:

- Run 1: 134 passing
- Run 2: 139 passing (+5)
- Run 3: 145 passing (+6)
- Run 4: 155 passing (+10)
- Target: 200+ passing (78%+)

### Track Progress

```bash
# See test summary over time
npm test -- --verbose 2>&1 | grep "Test Suites:"
npm test -- --verbose 2>&1 | grep "Tests:"
```

---

## Common Test Files to Fix

### Priority: HIGH

| File                        | Tests | Issue                       |
| --------------------------- | ----- | --------------------------- |
| api.chat.delete.test.ts     | 12    | Response mock returning 500 |
| security/jailbreaks.test.ts | 8     | checkIntent mock not set    |
| workers/processor.test.ts   | 15    | OpenAI response format      |

### Priority: MEDIUM

| File                    | Tests | Issue                    |
| ----------------------- | ----- | ------------------------ |
| lib/response.test.ts    | 6     | Response chaining broken |
| api.chat.create.test.ts | 10    | Job queue format         |
| services/rag.test.ts    | 12    | LanceDB mock missing     |

### Priority: LOW

| File                   | Tests | Issue              |
| ---------------------- | ----- | ------------------ |
| lib/encryption.test.ts | 8     | Crypto mock format |
| admin/users.test.ts    | 5     | Permission checks  |

---

## Prevention: Testing Checklist

Before committing new tests, verify:

- [ ] All jest.mock() calls before imports
- [ ] Response mocks have status(), json(), headers
- [ ] Prisma mocks set in beforeEach()
- [ ] Queue mocks return proper job format
- [ ] Timers cleared in afterEach()
- [ ] Test has at least 1 assertion
- [ ] Error messages are descriptive
- [ ] Test name matches what it tests
- [ ] No console.log() left in code
- [ ] Run `npm test` locally before pushing

---

## Helpful Commands Quick Reference

```bash
# See all test names
npm test -- --listTests

# Run one specific test
npm test -- api.auth.integration.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="register"

# Debug with more output
npm test -- --verbose

# See test coverage
npm test -- --coverage --coverageReporters=text-summary

# Watch mode for development
npm test -- --watch

# Clear cache if stuck
npm test -- --clearCache

# Run tests in series (slower but deterministic)
npm test -- --runInBand
```

---

## Next: Production Readiness Checklist

- [ ] 80%+ tests passing (200+/256)
- [ ] Coverage report generated
- [ ] CI/CD pipeline running
- [ ] All memory leaks fixed
- [ ] Performance benchmarks recorded
- [ ] Documentation updated
- [ ] Team trained on test infrastructure
- [ ] Monitoring dashboards set up
- [ ] Release notes prepared
- [ ] Production deployment tested

---

**Version**: 1.0  
**Last Updated**: Feb 15, 2026  
**Maintained By**: Aegis AI QA Team
