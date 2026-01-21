# GitHub Configuration

This document describes the GitHub-specific configuration for Aegis AI.

## 🔧 GitHub Features Enabled

### Repository Settings

1. **Branch Protection (main)**
   - Require pull request reviews: 1
   - Require status checks to pass
   - Require branches to be up to date
   - Require code reviews from code owners
   - Dismiss stale reviews

2. **Branch Protection (develop)**
   - Require pull request reviews: 1
   - Require status checks to pass

### Security Settings

- ✅ Dependabot alerts enabled
- ✅ Secret scanning enabled
- ✅ Push protection enabled
- ✅ Security policy configured

## 📋 Automated Workflows

### 1. **Tests** (.github/workflows/tests.yml)
- Runs on: `push` to main/develop, `pull_request`
- Runs: Unit tests with coverage upload
- Requirements: Node 20, PostgreSQL 16

### 2. **Lint & Type Check** (.github/workflows/lint.yml)
- Runs on: `push` to main/develop, `pull_request`
- Runs: ESLint, TypeScript type checking

### 3. **Security Scan** (.github/workflows/security.yml)
- Runs on: `push` to main/develop, `pull_request`, weekly schedule
- Runs: npm audit, OWASP Dependency Check

### 4. **Docker Build** (.github/workflows/docker.yml)
- Runs on: `push` to main (releases)
- Builds and pushes Docker image to registry
- Requires: Docker Hub credentials

## 👥 CODEOWNERS

File: `.github/CODEOWNERS`

Defines code ownership for automatic reviewer assignment:
- Global: @noorul-ahemed
- Frontend: @noorul-ahemed
- Backend/API: @noorul-ahemed
- Database: @noorul-ahemed
- Documentation: @noorul-ahemed

## 📝 Issue Templates

### Available Templates

1. **Bug Report** - `bug_report.yml`
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots

2. **Feature Request** - `feature_request.yml`
   - Problem statement
   - Proposed solution
   - Alternative approaches
   - Additional context

3. **Security Issue** - `security.yml`
   - Note: Directs to email instead
   - For documentation post-fix

## 🔄 Pull Request Template

File: `.github/PULL_REQUEST_TEMPLATE.md`

Includes:
- Description
- Related issues
- Type of change
- Testing details
- Checklist

## 🔐 Repository Secrets

The following secrets should be configured in GitHub:

```
DOCKER_USERNAME     # Docker Hub username
DOCKER_PASSWORD     # Docker Hub password
DATABASE_URL        # Test database URL
OPENAI_API_KEY      # OpenRouter API key (if needed for tests)
```

To add secrets:
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add name and value
4. Click "Add secret"

## 🏷️ Labels

Recommended GitHub labels:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `security` - Security vulnerability
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `blocked` - Blocked on another issue/PR
- `wontfix` - This will not be worked on
- `duplicate` - This issue or pull request already exists

## 📚 Branch Strategy

### Branching Convention

```
main/               - Production releases only
develop/            - Development / staging
feature/*           - Feature branches
bugfix/*            - Bug fix branches
hotfix/*            - Critical production fixes
docs/*              - Documentation only changes
chore/*             - Chores / dependencies
```

### Example Branches

```
feature/chat-improvements
bugfix/auth-token-expiry
hotfix/security-patch
docs/setup-guide
chore/update-dependencies
```

## ✅ Merge Strategy

- **main**: Squash and merge (one commit per feature)
- **develop**: Create merge commit (preserve history)

## 🚀 Release Process

1. Update `package.json` version
2. Update `docs/CHANGELOG.md`
3. Create tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Docker workflow automatically builds and pushes image

## 📊 GitHub Pages

To enable GitHub Pages for documentation:

1. Go to Settings → Pages
2. Select Source: Deploy from branch
3. Branch: main
4. Folder: /docs (if available)
5. Click Save

## 🔗 Useful Links

- [Repository](https://github.com/your-org/aegis-ai)
- [Issues](https://github.com/your-org/aegis-ai/issues)
- [Pull Requests](https://github.com/your-org/aegis-ai/pulls)
- [Discussions](https://github.com/your-org/aegis-ai/discussions)
- [Security](https://github.com/your-org/aegis-ai/security)
- [Actions](https://github.com/your-org/aegis-ai/actions)

## 📖 Related Files

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](../SECURITY.md) - Security policy
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - Community guidelines

---

**Note**: Some settings require repository administrator access. Adjust based on your team's needs.
