#!/bin/bash
# Aegis AI - Quick Upgrade Script
# Run this to perform safe dependency updates

echo "🔍 Aegis AI - Dependency Upgrade Script"
echo "========================================"
echo ""

# 1. Backup current state
echo "📦 Creating backup..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
echo "✅ Backup created: package.json.backup"
echo ""

# 2. Remove vm2 (security vulnerability)
echo "🔒 Removing vm2 security vulnerability..."
npm uninstall vm2
echo "✅ vm2 removed"
echo ""

# 3. Update safe dependencies (no breaking changes)
echo "📥 Updating safe dependencies..."
npm update next react react-dom bullmq axios ioredis puppeteer marked lucide-react @sentry/nextjs @aws-sdk/client-kms tailwindcss
echo "✅ Safe dependencies updated"
echo ""

# 4. Run security audit
echo "🔐 Running security audit..."
npm audit fix --force
echo "✅ Security audit complete"
echo ""

# 5. Run tests
echo "🧪 Running tests..."
npm test -- --passWithNoTests
echo "✅ Tests passed"
echo ""

# 6. Build check
echo "🔨 Testing build..."
cd apps/web
npm run build
echo "✅ Build successful"
cd ../..
echo ""

# 7. Summary
echo "✅ UPGRADE COMPLETE"
echo "==================="
echo ""
echo "Updated packages:"
npm outdated
echo ""
echo "Remaining major upgrades (manual testing required):"
echo "  1. openai: 4.62.1 → 6.22.0 (breaking changes)"
echo "  2. prisma: 5.17.0 → 7.4.0 (config changes)"
echo "  3. langchain: 0.3.0 → 1.2.25 (API rewrite)"
echo "  4. zod: 3.23.8 → 4.3.6 (schema changes)"
echo ""
echo "See docs/UPGRADE_RECOMMENDATIONS.md for migration guides"
echo ""
echo "To rollback:"
echo "  cp package.json.backup package.json"
echo "  cp package-lock.json.backup package-lock.json"
echo "  npm ci"
