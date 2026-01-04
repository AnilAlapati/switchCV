#!/bin/bash

# Auto-fetch secrets and start dev server
# This script ensures secrets are always fresh before starting development

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID=${FIREBASE_PROJECT:-"switchcv-dev"}

echo -e "${BLUE}🚀 Starting SwitchCV Development Server${NC}"
echo ""

# Step 1: Check if secrets need updating
echo -e "${BLUE}📋 Checking API keys...${NC}"

needs_update=false

# Check if .env.local exists and has valid keys
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  No .env.local found${NC}"
    needs_update=true
elif grep -q "REPLACE_ME" .env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found placeholder values in .env.local${NC}"
    needs_update=true
elif ! grep -q "GEMINI_API_KEY=" .env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Missing GEMINI_API_KEY${NC}"
    needs_update=true
else
    echo -e "${GREEN}✓ .env.local exists with values${NC}"
fi

# Step 2: Fetch secrets if needed
if [ "$needs_update" = true ]; then
    echo ""
    echo -e "${BLUE}🔑 Fetching secrets from Firebase (${PROJECT_ID})...${NC}"
    bash scripts/sync-secrets-from-firebase.sh "$PROJECT_ID"
    echo ""
fi

# Step 3: Start dev server with appropriate tier
echo -e "${GREEN}✓ Starting development server...${NC}"
echo ""

# Pass through environment variables for dev tiers
exec npm run dev:base
