# Contributing to Aegis AI

Thank you for your interest in contributing to **Aegis AI**! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please read and follow our [Code of Conduct](./docs/CODE_OF_CONDUCT.md) to ensure a welcoming and inclusive environment for all contributors.

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14+
- Redis 6+
- Git

### Fork & Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/aegis-ai.git
cd aegis-ai

# Add upstream remote
git remote add upstream https://github.com/noorulahamed/aegis-ai.git

# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

### Setup Development Environment

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your local configuration
# At minimum, you need:
# - DATABASE_URL: PostgreSQL connection
# - REDIS_URL: Redis connection
# - OPENROUTER_API_KEY: API key from https://openrouter.ai/
# - JWT_ACCESS_SECRET & JWT_REFRESH_SECRET: Generate with openssl
# - ENCRYPTION_KEY: Generate with openssl

# Generate Prisma client
npx prisma generate

# Run migrations
npm run migrate

# Start development server
npm run dev

# In another terminal, start the AI worker
npm run worker
```

---

## Development Guidelines

### Code Style

- **Language**: TypeScript (strict mode)
- **Formatter**: ESLint + Prettier (auto-format on save)
- **Naming**: camelCase for variables, PascalCase for components/classes

### Before Committing

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint -- --fix

# Run tests
npm test

# Run tests in watch mode for development
npm test -- --watch
```

### TypeScript

- Always use TypeScript for new files
- Enable strict mode: `"strict": true`
- Ensure type safety across all code
- Use interfaces over type aliases when possible

### Component Guidelines

- Use React functional components with hooks
- Keep components focused and single-responsibility
- Export components from an `index.ts` file
- Add JSDoc comments for complex logic

```typescript
/**
 * Displays user chat history
 * @param userId - The user's ID
 * @param limit - Maximum number of messages to display
 */
export const ChatHistory: React.FC<ChatHistoryProps> = ({
  userId,
  limit = 10,
}) => {
  // Component logic
};
```

---

## Architecture & Patterns

### API Routes

All API routes should:

1. Use `verifyAuth()` for authentication
2. Return standardized responses via `@/lib/response`
3. Log operations with structured logger
4. Handle errors gracefully

```typescript
import { successResponse, errorResponse } from "@/lib/response";
import { verifyAuth } from "@/services/auth/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    // Process request
    return successResponse({ data: result });
  } catch (error) {
    return errorResponse("Operation failed", { status: 500 });
  }
}
```

### Database Changes

- Always update `prisma/schema.prisma` first
- Run `npm run migrate` to create migration
- Never commit migration files to staging (they're auto-generated)
- Add indexes for frequently queried fields
- Use encryption for sensitive data

### AI Worker Operations

- **All LLM calls must happen in workers**, not API routes
- Use BullMQ to enqueue jobs: `await chatQueue.add(...)`
- Worker processes in `src/workers/chat.worker.ts`
- Return structured results: `{ success, data, error }`

### RAG & Vector Store

- Use `retrieveContext()` from `@/services/rag/rag-retrieval`
- LanceDB is server-side only - don't import in client components
- Check `shouldUseRAG()` before retrieval for optimization

---

## Commit Guidelines

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body

footer
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:

```bash
git commit -m "feat(chat): add streaming response support"
git commit -m "fix(auth): resolve JWT validation issue"
git commit -m "docs: update RAG implementation guide"
git commit -m "refactor(components): simplify input validation"
```

### Keep Commits Atomic

- Each commit should represent a single logical change
- Include related tests with features
- Don't mix refactoring with feature additions

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/short-description
   ```

2. **Keep commits clean**:

   ```bash
   git rebase -i origin/main  # Clean up history before PR
   ```

3. **Run all tests locally**:

   ```bash
   npm run lint
   npm test
   npm run test:coverage
   ```

4. **Update documentation** if needed:
   - README.md
   - Relevant docs in `docs/`
   - Code comments & JSDoc

### Submitting PR

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Link to related issues (if any)
   - Screenshots for UI changes
   - Test instructions

3. **PR Template** (automatically loaded):

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Other

   ## Related Issues

   Fixes #123

   ## Testing

   Steps to test the changes

   ## Checklist

   - [ ] Tests pass
   - [ ] Code follows style guidelines
   - [ ] Documentation updated
   - [ ] No breaking changes
   ```

### Review Process

- At least one maintainer review required
- Address feedback and push new commits
- Keep conversation professional and constructive
- Once approved, maintainer will merge

---

## Testing

### Writing Tests

```bash
# Tests live in src/__tests__/
# Use Jest + Testing Library
# Run: npm test
```

**Test structure**:

```typescript
describe("Chat API", () => {
  it("should create a new chat", async () => {
    // Arrange
    const userId = "123";

    // Act
    const result = await createChat(userId);

    // Assert
    expect(result).toHaveProperty("id");
    expect(result.userId).toBe(userId);
  });
});
```

### Test Coverage

- Aim for 80%+ overall coverage
- 100% coverage for critical paths (auth, encryption, RAG)
- Run coverage report: `npm test:coverage`

---

## Documentation

### Writing Docs

- Use Markdown format
- Include code examples where relevant
- Update table of contents if adding new sections
- Keep language clear and concise

**Document structure**:

```markdown
# Title

Brief overview (1-2 sentences)

## Table of Contents

- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1

Content...

## Section 2

Content...
```

### Updating README

If your change affects how to use the project:

- Update main [README.md](./README.md)
- Update relevant docs in `docs/` directory
- Update quick start guides

---

## Issues & Bug Reports

### Reporting Issues

When reporting bugs, include:

- **Title**: Clear, descriptive
- **Description**: What happened vs. what was expected
- **Steps to reproduce**: Exact steps to trigger the issue
- **Environment**: Node version, OS, browser (if applicable)
- **Screenshots/Logs**: If relevant

**Label your issue**:

- `bug` - Actual bugs
- `enhancement` - Feature requests
- `documentation` - Doc improvements
- `good first issue` - Beginner-friendly

### Feature Requests

- Start with a clear use case
- Explain the proposed solution
- List any alternatives you've considered
- Link related issues/discussions

---

## Running Tests with MCP

```bash
# Test MCP server integration
npm run test:mcp

# Tests MCP servers: filesystem, github, puppeteer
```

---

## Performance & Security

### Performance

- Profile code before optimizing
- Use React DevTools profiler
- Check bundle size: `npm build`
- Optimize database queries with indexes

### Security

- Never commit secrets or API keys
- Use `.env.local` for local configuration
- Encrypt sensitive data at rest
- Always validate & sanitize user input
- Run security checks: `npm run test`

---

## Getting Help

- **Documentation**: Check `docs/` directory
- **GitHub Issues**: Search existing issues
- **Pull Request Discussions**: Join ongoing PRs
- **Community**: Respectful discussions in issues

---

## Recognition

Contributors will be recognized in:

- `CONTRIBUTORS.md` file
- GitHub contributors page
- Release notes (for significant contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Aegis AI! 🎉

---

## Additional Resources

- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
