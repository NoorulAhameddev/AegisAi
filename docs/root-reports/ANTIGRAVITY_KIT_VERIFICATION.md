# 🎯 Antigravity Kit Verification Guide

## Quick Verification Steps

### 1. Check Installation

```powershell
# Check if .agent folder exists
if (Test-Path "d:\Aegis-Ai\.agent") {
    Write-Host "✅ .agent folder installed" -ForegroundColor Green
} else {
    Write-Host "❌ .agent folder missing" -ForegroundColor Red
}

# Check Git exclude
if (Get-Content ".git\info\exclude" | Select-String ".agent/") {
    Write-Host "✅ Git exclude configured" -ForegroundColor Green
} else {
    Write-Host "❌ Git exclude not configured" -ForegroundColor Red
}

# List installed components
Write-Host "`n📦 Installed Components:" -ForegroundColor Cyan
Write-Host "Agents: $((Get-ChildItem .agent\agents -Filter *.md).Count)"
Write-Host "Skills: $((Get-ChildItem .agent\skills -Directory).Count)"
Write-Host "Workflows: $((Get-ChildItem .agent\workflows -Filter *.md).Count)"
```

### 2. Test in VS Code

#### Option A: Using GitHub Copilot Chat

1. Open GitHub Copilot Chat (`Ctrl+Shift+I` or `Cmd+Shift+I`)
2. Type `/` - You should see:
   - `/brainstorm`
   - `/create`
   - `/debug`
   - `/deploy`
   - `/enhance`
   - `/orchestrate`
   - `/plan`
   - `/preview`
   - `/status`
   - `/test`
   - `/ui-ux-pro-max`

3. Try a simple command:
   ```
   /status
   ```

#### Option B: Agent Invocation

In Copilot Chat, try:

```
@frontend-specialist What are React best practices for this project?
```

You should see: `🤖 Applying knowledge from @frontend-specialist...`

### 3. Test Workflow

Try this complete workflow:

```
Step 1: /brainstorm new feature for exporting chat history

Step 2: /plan implement chat export feature

Step 3: /create API route for chat export

Step 4: /test chat export functionality
```

### 4. Verify Agent Auto-Selection

Try natural language requests:

```
Request 1: "Add JWT refresh token rotation"
Expected: 🤖 Using @security-auditor + @backend-specialist

Request 2: "Fix mobile responsive layout"
Expected: 🤖 Using @frontend-specialist

Request 3: "Optimize database queries"
Expected: 🤖 Using @database-architect + @performance-optimizer
```

## Expected Results

### ✅ Success Indicators

1. **Slash commands visible** in Copilot Chat autocomplete
2. **Agents mentioned** when AI responds to requests
3. **Structured responses** following agent patterns
4. **Skills referenced** in agent responses

### ❌ Failure Indicators

1. **No slash commands** appear when typing `/`
2. **Generic responses** without agent mentions
3. **No specialist knowledge** applied
4. **"Command not found"** errors

## Troubleshooting

### Issue 1: Commands Not Appearing

**Symptoms**: Typing `/` shows no antigravity commands

**Solutions**:

```powershell
# 1. Verify .agent folder exists and has content
Get-ChildItem .agent -Recurse | Select-Object FullName

# 2. Check VS Code settings
code .vscode\settings.json
# Ensure .agent is not in files.exclude or search.exclude

# 3. Reload VS Code
# Press Ctrl+Shift+P → "Developer: Reload Window"

# 4. Clear Copilot cache
# Press Ctrl+Shift+P → "GitHub Copilot: Clear Cache"
```

### Issue 2: Agents Not Being Applied

**Symptoms**: AI responds without mentioning agents

**Solutions**:

1. **Restart VS Code** completely (close all instances)
2. **Check Copilot Status**: Ensure GitHub Copilot is active
3. **Try explicit mention**: `@frontend-specialist help me`
4. **Update Antigravity Kit**: `ag-kit update`

### Issue 3: Git Tracking .agent

**Symptoms**: `git status` shows .agent as untracked

**Solutions**:

```powershell
# Verify exclude file
Get-Content .git\info\exclude

# Should contain:
# .agent/

# If missing, add it:
Add-Content -Path ".git\info\exclude" -Value "`n.agent/`n"
```

### Issue 4: Outdated Templates

**Symptoms**: Agents behave differently than docs describe

**Solutions**:

```powershell
# Update to latest version
ag-kit update

# Or force reinstall
ag-kit init --force
```

## Manual Verification

### Check Agent Files

```powershell
# List all agents
Get-ChildItem .agent\agents\*.md | Select-Object Name

# Expected output (20 files):
# - backend-specialist.md
# - code-archaeologist.md
# - database-architect.md
# - debugger.md
# - devops-engineer.md
# - documentation-writer.md
# - explorer-agent.md
# - frontend-specialist.md
# - game-developer.md
# - mobile-developer.md
# - orchestrator.md
# - penetration-tester.md
# - performance-optimizer.md
# - product-manager.md
# - product-owner.md
# - project-planner.md
# - qa-automation-engineer.md
# - security-auditor.md
# - seo-specialist.md
# - test-engineer.md
```

### Check Workflow Files

```powershell
# List all workflows
Get-ChildItem .agent\workflows\*.md | Select-Object Name

# Expected output (11 files):
# - brainstorm.md
# - create.md
# - debug.md
# - deploy.md
# - enhance.md
# - orchestrate.md
# - plan.md
# - preview.md
# - status.md
# - test.md
# - ui-ux-pro-max.md
```

### Check Skills

```powershell
# List all skills
Get-ChildItem .agent\skills -Directory | Select-Object Name

# Expected: 37 directories with domain knowledge
```

## Integration Test

Create a test file to verify agent knowledge:

```typescript
// test-antigravity.ts

/**
 * Test file for Antigravity Kit verification
 *
 * Ask in Copilot Chat:
 * "@frontend-specialist Review this React component for best practices"
 *
 * Expected: AI should identify issues with state management,
 * naming conventions, and suggest improvements based on
 * react-best-practices skill
 */

import { useState } from 'react';

export default function TestComponent() {
  const [data, setData] = useState<any>(null); // Poor typing

  const handleClick = async () => {
    // Missing error handling
    const result = await fetch('/api/test');
    setData(result);
  };

  return (
    <div onClick={handleClick}>
      {/* Accessibility issues */}
      {data && <p>{data}</p>}
    </div>
  );
}
```

Ask AI to review this file. A successful integration will provide:

- ✅ Specific React best practices violations
- ✅ Type safety improvements
- ✅ Accessibility recommendations
- ✅ Error handling patterns
- ✅ Performance optimizations

## CLI Verification

```powershell
# Check CLI version
ag-kit --version

# Check installation status
ag-kit status

# Expected output:
# ✅ .agent folder: installed
# ✅ Agents: 20
# ✅ Skills: 37
# ✅ Workflows: 11
# ✅ Git exclude: configured
```

## Success Checklist

- [ ] `.agent` folder exists with subdirectories
- [ ] Git exclude configured (`.git/info/exclude`)
- [ ] VS Code settings updated
- [ ] Slash commands appear in Copilot Chat
- [ ] Agent mentions in AI responses
- [ ] Skills applied automatically
- [ ] Workflows execute correctly
- [ ] Multi-agent orchestration works
- [ ] Agent auto-selection functions
- [ ] Documentation accessible in VS Code

## Performance Benchmark

Test response quality:

| Test                | Without Antigravity | With Antigravity                   |
| ------------------- | ------------------- | ---------------------------------- |
| "Build auth system" | Generic code        | Specialist-level security patterns |
| "Fix bug"           | Trial-and-error     | Systematic debugging approach      |
| "Optimize code"     | Basic suggestions   | Performance profiling + metrics    |
| "Design UI"         | Standard layout     | 50 design styles + accessibility   |

## Next Steps After Verification

1. ✅ Familiarize with [Quick Reference](./ANTIGRAVITY_KIT_QUICK_REF.md)
2. ✅ Try sample workflows from [Full Guide](./ANTIGRAVITY_KIT_GUIDE.md)
3. ✅ Use `/plan` for next feature
4. ✅ Integrate agents into daily workflow
5. ✅ Explore all 20 agent specialties

---

**Questions or Issues?**

- 📖 [Full Documentation](./ANTIGRAVITY_KIT_GUIDE.md)
- 🌐 [Official Site](https://antigravity-kit.vercel.app)
- 💻 [GitHub Repo](https://github.com/vudovn/antigravity-kit)
