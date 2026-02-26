# 🚀 Antigravity Kit - Quick Reference

## Slash Commands (GitHub Copilot Chat)

| Command          | Purpose          | Example                              |
| ---------------- | ---------------- | ------------------------------------ |
| `/brainstorm`    | Explore options  | `/brainstorm authentication methods` |
| `/plan`          | Task breakdown   | `/plan implement user dashboard`     |
| `/create`        | Build features   | `/create REST API endpoint`          |
| `/debug`         | Fix issues       | `/debug Worker queue stuck`          |
| `/test`          | Generate tests   | `/test authentication flow`          |
| `/enhance`       | Improve code     | `/enhance database queries`          |
| `/orchestrate`   | Multi-agent task | `/orchestrate full-stack feature`    |
| `/deploy`        | Deploy app       | `/deploy to production`              |
| `/preview`       | Preview locally  | `/preview changes`                   |
| `/status`        | Check status     | `/status`                            |
| `/ui-ux-pro-max` | Professional UI  | `/ui-ux-pro-max modern dashboard`    |

## 20 Specialist Agents

### 🔨 Development

- `@frontend-specialist` - React, Next.js, UI/UX
- `@backend-specialist` - APIs, Node.js, NestJS
- `@database-architect` - Database design, Prisma
- `@mobile-developer` - React Native
- `@game-developer` - Game development
- `@devops-engineer` - Docker, CI/CD, deployment

### ✅ Quality & Security

- `@test-engineer` - Unit/integration testing
- `@qa-automation-engineer` - Test automation
- `@security-auditor` - Security review
- `@penetration-tester` - Security testing
- `@performance-optimizer` - Performance tuning

### 📋 Management

- `@project-planner` - Planning, architecture
- `@product-manager` - Feature planning
- `@product-owner` - Product strategy
- `@documentation-writer` - Technical docs

### 🔧 Utility

- `@debugger` - Systematic debugging
- `@orchestrator` - Multi-agent coordination
- `@explorer-agent` - Codebase exploration
- `@code-archaeologist` - Legacy code analysis
- `@seo-specialist` - SEO optimization

## Usage Tips

### Automatic Selection

Just describe your task - AI picks the right agent:

```
"Add JWT authentication" → @security-auditor + @backend-specialist
"Fix dark mode" → @frontend-specialist
"500 error on login" → @debugger
```

### Explicit Selection

Mention agent directly:

```
@security-auditor review this auth code
@performance-optimizer analyze API routes
```

### Multi-Step Workflow

```
/brainstorm payment integration
/plan Stripe integration
/create Stripe payment flow
/test payment processing
```

## 37 Domain Skills

### Frontend

- `react-best-practices`, `nextjs-expert`, `tailwind-patterns`
- `frontend-design`, `web-design-guidelines`

### Backend

- `api-patterns`, `nodejs-best-practices`, `nestjs-expert`
- `database-design`, `prisma-expert`

### DevOps

- `docker-expert`, `deployment-procedures`, `ci-cd-pipelines`

### Quality

- `testing-patterns`, `webapp-testing`, `tdd-workflow`
- `performance-profiling`, `vulnerability-scanner`

### Specialized

- `game-development`, `mobile-design`, `seo-fundamentals`
- `i18n-localization`, `systematic-debugging`

## Common Patterns

### Starting a Feature

```
/brainstorm [feature idea]
/plan [feature implementation]
/create [actual feature]
/test [feature]
```

### Debugging

```
/debug [issue description]
# AI analyzes systematically
# Suggests fix
/test [verification]
```

### Security Review

```
@security-auditor review [code/file]
# Gets security analysis
# Apply recommendations
```

### Performance Optimization

```
@performance-optimizer analyze [component/route]
# Gets optimization suggestions
# Implement improvements
/test [performance verification]
```

## Aegis AI Integration

Agents understand:

- ✅ BullMQ worker architecture
- ✅ Next.js 16 App Router patterns
- ✅ Prisma database schema
- ✅ Security standards (encryption, audit logs)
- ✅ Jest/Playwright testing patterns

## Installation & Updates

```bash
# Install globally
npm install -g @vudovn/ag-kit

# Initialize in project
ag-kit init

# Update to latest
ag-kit update

# Force reinstall
ag-kit init --force
```

## Troubleshooting

### Commands not appearing?

1. Check `.agent` folder exists
2. Reload VS Code window
3. Clear Copilot cache
4. Verify `.agent` not in `files.exclude`

### Agents not working?

1. Restart VS Code
2. Check `.git/info/exclude` has `.agent/`
3. Run `ag-kit status`

---

📖 **[Full Guide](./ANTIGRAVITY_KIT_GUIDE.md)** | 🌐 **[Official Docs](https://antigravity-kit.vercel.app/docs)**
