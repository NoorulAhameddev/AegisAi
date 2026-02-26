#!/bin/bash

# Character System Testing & Deployment Script
# Tests character functionality and runs seeder

set -e

echo "🎯 Character System Testing & Setup"
echo "===================================="

# 1. Database migration
echo -e "\n\n📦 Step 1: Running database migration..."
npm run migrate

# 2. Seed system characters
echo -e "\n\n🌱 Step 2: Seeding default character presets..."
npx ts-node --project tsconfig.json prisma/seeders/character-presets.ts

# 3. Run unit tests
echo -e "\n\n✅ Step 3: Running character system tests..."
npm test -- character-service.test.ts --verbose

# 4. API Tests
echo -e "\n\n🔌 Step 4: Testing character API endpoints..."

# Helper function to make API requests
api_test() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo "Testing: $description"
    
    if [ -z "$data" ]; then
        curl -s -X "$method" "http://localhost:3000/api$endpoint" \
            -H "Authorization: Bearer TEST_TOKEN" \
            -H "Content-Type: application/json" | jq .
    else
        curl -s -X "$method" "http://localhost:3000/api$endpoint" \
            -H "Authorization: Bearer TEST_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" | jq .
    fi
    
    echo ""
}

# Note: These require running dev server in another terminal
echo "ℹ️  Run 'npm run dev' in another terminal before running API tests"
echo "⏱️  Waiting 5 seconds..."
sleep 5

# Get characters
echo -e "\n📋 GET /api/characters"
api_test "GET" "/characters" "Fetch all characters"

# Create character
echo -e "\n✨ POST /api/characters"
api_test "POST" "/characters" "Create new character" '{
  "name": "Test Character",
  "description": "Test description",
  "systemPrompt": "You are a helpful assistant",
  "category": "Testing"
}'

echo -e "\n\n✅ Character system testing complete!"
echo "===================================="
echo ""
echo "📚 Next Steps:"
echo "1. npm run dev          - Start development server"
echo "2. Open /characters     - View character manager"
echo "3. Create a new chat    - Select a character"
echo "4. Test character switching in chat"
echo ""
echo "📖 Documentation:"
echo "- docs/CHARACTER_SYSTEM_PLAN.md"
echo ""
