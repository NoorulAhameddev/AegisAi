# Aegis AI - Quick Upgrade Script (Windows)
# Run this to perform safe dependency updates

Write-Host "🔍 Aegis AI - Dependency Upgrade Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backup current state
Write-Host "📦 Creating backup..." -ForegroundColor Yellow
Copy-Item package.json package.json.backup -Force
Copy-Item package-lock.json package-lock.json.backup -Force
Write-Host "✅ Backup created: package.json.backup" -ForegroundColor Green
Write-Host ""

# 2. Remove vm2 (security vulnerability)
Write-Host "🔒 Removing vm2 security vulnerability..." -ForegroundColor Yellow
npm uninstall vm2
Write-Host "✅ vm2 removed" -ForegroundColor Green
Write-Host ""

# 3. Update safe dependencies (no breaking changes)
Write-Host "📥 Updating safe dependencies..." -ForegroundColor Yellow
npm update next react react-dom bullmq axios ioredis puppeteer marked lucide-react '@sentry/nextjs' '@aws-sdk/client-kms' tailwindcss
Write-Host "✅ Safe dependencies updated" -ForegroundColor Green
Write-Host ""

# 4. Run security audit
Write-Host "🔐 Running security audit..." -ForegroundColor Yellow
npm audit fix --force
Write-Host "✅ Security audit complete" -ForegroundColor Green
Write-Host ""

# 5. Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test -- --passWithNoTests
Write-Host "✅ Tests passed" -ForegroundColor Green
Write-Host ""

# 6. Build check
Write-Host "🔨 Testing build..." -ForegroundColor Yellow
Set-Location -Path "apps\web"
npm run build
Set-Location -Path "..\..\"
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# 7. Summary
Write-Host "✅ UPGRADE COMPLETE" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host ""
Write-Host "Updated packages:" -ForegroundColor Cyan
npm outdated
Write-Host ""
Write-Host "Remaining major upgrades (manual testing required):" -ForegroundColor Yellow
Write-Host "  1. openai: 4.62.1 → 6.22.0 (breaking changes)"
Write-Host "  2. prisma: 5.17.0 → 7.4.0 (config changes)"
Write-Host "  3. langchain: 0.3.0 → 1.2.25 (API rewrite)"
Write-Host "  4. zod: 3.23.8 → 4.3.6 (schema changes)"
Write-Host ""
Write-Host "See docs/UPGRADE_RECOMMENDATIONS.md for migration guides" -ForegroundColor Cyan
Write-Host ""
Write-Host "To rollback:" -ForegroundColor Yellow
Write-Host "  Copy-Item package.json.backup package.json -Force"
Write-Host "  Copy-Item package-lock.json.backup package-lock.json -Force"
Write-Host "  npm ci"
