# Antigravity Kit Integration Guide

## 🚀 Overview

**Antigravity Kit** is now integrated into the Aegis AI project! It provides AI agent templates with specialist personas, domain-specific skills, and workflow commands to enhance AI-assisted development in VS Code.

## 📦 What's Installed

The `.agent` folder contains:

| Component     | Count | Description                                                        |
| ------------- | ----- | ------------------------------------------------------------------ |
| **Agents**    | 20    | Specialist AI personas (frontend, backend, security, PM, QA, etc.) |
| **Skills**    | 37    | Domain-specific knowledge modules                                  |
| **Workflows** | 11    | Slash command procedures                                           |

## 🎯 Available Agents

### Development Specialists

- **frontend-specialist** - React, Next.js, UI/UX development
- **backend-specialist** - API development, Node.js, NestJS
- **database-architect** - Database design, Prisma, schema optimization
- **mobile-developer** - React Native, mobile app development
- **game-developer** - Game development expertise
- **devops-engineer** - Deployment, Docker, CI/CD

### Quality & Security

- **test-engineer** - Unit testing, integration testing, TDD
- **qa-automation-engineer** - Automated testing strategies
- **security-auditor** - Security analysis and best practices
- **penetration-tester** - Security testing and vulnerability assessment
- **performance-optimizer** - Performance analysis and optimization

### Project Management

- **project-planner** - Task breakdown, planning, architecture
- **product-manager** - Feature planning and prioritization
- **product-owner** - Product strategy and requirements
- **documentation-writer** - Technical documentation

### Utility Agents

- **debugger** - Systematic debugging strategies
- **orchestrator** - Multi-agent task coordination
- **explorer-agent** - Codebase exploration and analysis
- **code-archaeologist** - Legacy code analysis
- **seo-specialist** - SEO optimization

## 🔧 Available Workflows

Use these slash commands in GitHub Copilot Chat:

| Command          | Description                           | Example                                  |
| ---------------- | ------------------------------------- | ---------------------------------------- |
| `/brainstorm`    | Explore options before implementation | `/brainstorm authentication system`      |
| `/create`        | Create new features or apps           | `/create landing page with hero section` |
| `/debug`         | Systematic debugging                  | `/debug why login fails`                 |
| `/deploy`        | Deploy application                    | `/deploy to production`                  |
| `/enhance`       | Improve existing code                 | `/enhance performance of API routes`     |
| `/orchestrate`   | Multi-agent coordination              | `/orchestrate full-stack feature`        |
| `/plan`          | Create task breakdown                 | `/plan new dashboard feature`            |
| `/preview`       | Preview changes locally               | `/preview current branch`                |
| `/status`        | Check project status                  | `/status`                                |
| `/test`          | Generate and run tests                | `/test authentication flow`              |
| `/ui-ux-pro-max` | Design with 50 styles                 | `/ui-ux-pro-max create modern dashboard` |

## 🎨 How to Use in VS Code

### Automatic Agent Selection

The AI automatically detects and applies the right specialist based on your request:

```
You: "Add JWT authentication"
AI: 🤖 Applying knowledge from @security-auditor + @backend-specialist...

You: "Fix the dark mode button"
AI: 🤖 Using @frontend-specialist...

You: "Login returns 500 error"
AI: 🤖 Using @debugger for systematic analysis...
```

**No need to mention agents explicitly!** The system:

- ✅ Analyzes your request silently
- ✅ Detects domain(s) automatically (frontend, backend, security, etc.)
- ✅ Selects the best specialist(s)
- ✅ Informs you which expertise is being applied

### Using Workflows in Copilot Chat

1. Open GitHub Copilot Chat in VS Code (`Ctrl+Shift+I` or `Cmd+Shift+I`)
2. Type `/` to see available commands
3. Select a workflow command or type it directly:
   ```
   /plan Implement user profile feature
   /create API endpoint for user settings
   /debug Database connection timing out
   ```

### Example Workflows

#### Planning a Feature

```
You: /plan Implement real-time chat feature

AI: 🤖 Applying @project-planner...

📋 Project Plan: Real-time Chat Feature

1. Backend Setup (2-3 hours)
   - WebSocket server configuration
   - Message persistence in database
   - User authentication for WebSocket

2. Frontend Implementation (3-4 hours)
   - Chat UI components
   - WebSocket client integration
   - Message history loading

3. Testing (1-2 hours)
   - Unit tests for message handling
   - E2E tests for chat flow
   - Performance testing with multiple users
```

#### Building a Feature

```
You: /create User authentication with JWT

AI: 🤖 Using @backend-specialist + @security-auditor...

Creating:
- src/services/auth/jwt.ts (JWT token generation)
- src/app/api/auth/login/route.ts (Login endpoint)
- src/middleware/auth.ts (Auth middleware)
- tests/auth.spec.ts (Test suite)
```

#### Debugging Issues

```
You: /debug API returns 500 error on login

AI: 🤖 Applying @debugger...

🔍 Systematic Debugging:

1. Checking error logs...
2. Analyzing stack trace...
3. Testing database connection...
4. Validating input data...

💡 Root Cause: Missing environment variable DATABASE_URL
```

## 🧩 Skills Library

Skills are automatically loaded based on task context. Some key skills include:

### Frontend Skills

- `react-best-practices` - React patterns and conventions
- `nextjs-expert` - Next.js 16 App Router expertise
- `tailwind-patterns` - Tailwind CSS best practices
- `frontend-design` - UI/UX design principles
- `web-design-guidelines` - Web accessibility and standards

### Backend Skills

- `api-patterns` - REST/GraphQL API design
- `nodejs-best-practices` - Node.js development
- `nestjs-expert` - NestJS framework
- `database-design` - Database schema design
- `prisma-expert` - Prisma ORM patterns

### DevOps Skills

- `docker-expert` - Container orchestration
- `deployment-procedures` - Deployment strategies
- `ci-cd-pipelines` - Continuous integration/deployment

### Quality Skills

- `testing-patterns` - Testing strategies
- `webapp-testing` - E2E testing with Playwright
- `tdd-workflow` - Test-driven development
- `performance-profiling` - Performance optimization
- `vulnerability-scanner` - Security scanning

### Specialized Skills

- `game-development` - Game dev patterns
- `mobile-design` - Mobile UX patterns
- `seo-fundamentals` - SEO best practices
- `i18n-localization` - Internationalization
- `systematic-debugging` - Debugging methodology

## 📁 Configuration

### VS Code Settings

The `.vscode/settings.json` has been updated to:

- Keep `.agent` folder visible for AI indexing
- Enable GitHub Copilot for `.agent` files
- Ensure AI can read agent templates

### Git Configuration

The `.agent` folder is added to `.git/info/exclude` (not `.gitignore`) to:

- Keep it local to your machine
- Allow VS Code and AI to index it
- Prevent it from being committed to Git

This is the **recommended approach** for AI-powered editors like VS Code with GitHub Copilot.

## 🔄 Updating

To update to the latest version:

```bash
ag-kit update
```

Or force reinstall:

```bash
ag-kit init --force
```

## 🎓 Advanced Usage

### Multi-Agent Orchestration

For complex tasks requiring multiple specialists:

```
You: /orchestrate Build a full-stack e-commerce feature

AI: 🤖 Orchestrating multiple agents...

Sequence:
1. @database-architect - Design product schema
2. @backend-specialist - Create API endpoints
3. @frontend-specialist - Build UI components
4. @test-engineer - Write test suite
5. @security-auditor - Security review
```

### Custom Agent Selection

You can explicitly mention agents:

```
You: Hey @security-auditor, review this authentication code

AI: 🤖 Applying @security-auditor expertise...
```

### Combining Workflows

```
You: /brainstorm payment integration options

After brainstorming:

You: /plan Implement Stripe payment gateway

After planning:

You: /create Stripe integration based on the plan

After creating:

You: /test payment flow
```

## 🐛 Troubleshooting

### Slash Commands Not Appearing

If `/plan`, `/debug`, etc. don't appear in Copilot chat:

1. **Check VS Code Settings**: Ensure `.agent` folder is not in `files.exclude`
2. **Reload Window**: Press `Ctrl+Shift+P` → "Reload Window"
3. **Verify Installation**: Check that `d:\Aegis-Ai\.agent` exists with subdirectories
4. **Check Git Exclude**: Ensure `.agent/` is in `.git/info/exclude`, NOT `.gitignore`

### Agents Not Being Applied

1. **Restart VS Code** after installation
2. **Clear Copilot Cache**: `Ctrl+Shift+P` → "GitHub Copilot: Clear Cache"
3. **Check Logs**: Open Copilot logs to see if agents are being loaded

### Update Required

If you see outdated behavior:

```bash
ag-kit update
```

Then reload VS Code.

## 📚 Additional Resources

- **[Official Documentation](https://antigravity-kit.vercel.app/docs)** - Full online documentation
- **[Agent Flow Architecture](.agent/ARCHITECTURE.md)** - Detailed flow diagrams
- **[Example Projects](https://antigravity-kit.vercel.app/docs/guide/examples/brainstorm)** - Step-by-step guides

## 🆘 Common Use Cases

### 1. Starting a New Feature

```bash
/brainstorm new admin dashboard feature
# Review options

/plan admin dashboard with user management
# Get detailed task breakdown

/create admin dashboard UI components
# Generate code
```

### 2. Fixing a Bug

```bash
/debug Authentication tokens expiring too quickly
# Systematic analysis

# Implement fix

/test authentication token lifecycle
# Verify fix
```

### 3. Code Review

```bash
Hey @security-auditor, review the authentication implementation in src/services/auth/

Hey @performance-optimizer, analyze API response times
```

### 4. Deployment

```bash
/plan production deployment strategy

/deploy to Vercel with environment variables
```

## 🎯 Integration with Aegis AI

The Antigravity Kit agents are now aware of the Aegis AI project structure:

- **Chat Processing**: Agents understand the BullMQ worker architecture
- **API Routes**: Agents follow Next.js 16 App Router patterns
- **Database**: Agents know the Prisma schema and models
- **Security**: Agents apply Aegis security standards (encryption, audit logging)
- **Testing**: Agents use Jest and Playwright patterns from the project

## 📝 Quick Reference

### Most Useful Commands for Aegis AI

| Task            | Command                  | Example                                |
| --------------- | ------------------------ | -------------------------------------- |
| Add new feature | `/create`                | `/create API endpoint for chat export` |
| Fix bugs        | `/debug`                 | `/debug Worker not processing jobs`    |
| Plan feature    | `/plan`                  | `/plan RAG improvements`               |
| Review security | `@security-auditor`      | `Review authentication middleware`     |
| Optimize code   | `@performance-optimizer` | `Optimize database queries`            |
| Write tests     | `/test`                  | `/test chat streaming functionality`   |
| Multi-step task | `/orchestrate`           | `/orchestrate new admin feature`       |

## ✅ Verification

To verify the installation is working:

1. Open GitHub Copilot Chat in VS Code
2. Type `/` - You should see workflow commands like `/plan`, `/debug`, etc.
3. Try a command: `/status`
4. Mention an agent: `@frontend-specialist help me with React components`

If everything is working, you should see agents being applied automatically!

---

**Happy Coding with Antigravity Kit! 🚀**

For issues or questions, refer to the [official repository](https://github.com/vudovn/antigravity-kit).
