## Description

<!-- Describe your changes -->

## Related Issue

<!-- Link to related issue (e.g., Closes #123) -->

Closes #

## Type of Change

<!-- Delete options that are not relevant -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security improvement

## How Has This Been Tested?

<!-- Describe the tests you ran and how to reproduce -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

**Test Configuration:**

- Node version:
- Database:
- Browser (if applicable):

## Security Review

<!-- Security checklist - all items must be addressed -->

- [ ] No secrets, API keys, or credentials committed
- [ ] Input validation added for all user inputs
- [ ] SQL injection prevention verified (Prisma parameterized queries)
- [ ] XSS prevention in place (output encoding, CSP headers)
- [ ] Authentication/authorization checks added where needed
- [ ] Sensitive data encrypted at rest (ENCRYPTION_KEY used)
- [ ] CORS configuration updated if new origins added
- [ ] Dependencies reviewed for known vulnerabilities (`npm audit`)

## Test Coverage

- [ ] Unit tests added/updated for new functionality
- [ ] Integration tests added for API changes
- [ ] Test coverage meets minimum thresholds (Lines: 60%, Branches: 50%, Functions: 60%, Statements: 60%)
- [ ] Edge cases and error paths tested
- [ ] CI pipeline passes (lint, typecheck, test, build)

## Environment Variables

<!-- Check if any environment variables are added, modified, or removed -->

- [ ] New environment variables documented in `.env.example`
- [ ] Staging values added to `.env.staging`
- [ ] Production values communicated to ops team
- [ ] No hardcoded secrets in code
- [ ] Feature flags added if toggling new behavior

## Checklist

<!-- Ensure all items are checked before submitting -->

- [ ] My code follows the code style of this project ([CONTRIBUTING.md](../CONTRIBUTING.md))
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes -->

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance may be affected (explain below)

**Details:**

## Breaking Changes

<!-- Describe any breaking changes -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

**Details:**

<!-- If breaking changes, include: -->
<!-- - What breaks -->
<!-- - Migration steps for users -->
<!-- - Timeline for deprecation (if applicable) -->

## Additional Context

<!-- Add any other context about the PR here -->

---

**Reviewer Notes:**

- Estimated review time:
- Priority level: Low / Medium / High / Critical
