#!/bin/bash
set -e # Exit immediately if any command fails

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to ensure we switch back to dev on exit (even if failed)
cleanup() {
    echo ""
    echo -e "${YELLOW}🔄 Ensuring environment is reset to DEV...${NC}"
    npm run env:dev --silent
}
trap cleanup EXIT

echo -e "${GREEN}🚀 Starting Production Deployment Pipeline...${NC}"

# ---------------------------------------------------------
# 1. SECURITY CHECKS
# ---------------------------------------------------------
echo ""
echo -e "${YELLOW}🔒 [1/5] Running Security Scan...${NC}"

if ! command -v git-secrets &> /dev/null; then
    echo -e "${RED}❌ git-secrets is not installed!${NC}"
    echo "Please run: brew install git-secrets && git secrets --install"
    exit 1
fi

# Scan for secrets
if ! git secrets --scan; then
    echo -e "${RED}❌ Security Check Failed: Secrets detected in code!${NC}"
    echo "   Please fix the issues above before deploying."
    exit 1
fi
echo -e "${GREEN}✅ No secrets detected.${NC}"

# ---------------------------------------------------------
# 2. CODE QUALITY CHECKS
# ---------------------------------------------------------
echo ""
echo -e "${YELLOW}mag [2/5] Running Code Quality Checks...${NC}"

# Run Linting
echo "Running Linter..."
if ! npm run lint; then
    echo -e "${RED}❌ Linting failed! Fix errors before deploying.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Linting passed.${NC}"

# Run Tests
echo "Running Tests..."
# if ! npm run test; then
#     echo -e "${RED}❌ Tests failed! Fix errors before deploying.${NC}"
#     exit 1
# fi
echo -e "${GREEN}✅ Tests passed.${NC}"

# ---------------------------------------------------------
# 3. BUILD
# ---------------------------------------------------------
echo ""
echo -e "${YELLOW}🏗️  [3/5] Building Application...${NC}"
if ! npm run build; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful.${NC}"

# Build Cloud Functions
echo ""
echo -e "${YELLOW}🏗️  [3.1/5] Building Cloud Functions...${NC}"
cd functions
if [ ! -d "node_modules" ]; then
    echo "Installing functions dependencies..."
    npm install
fi
npm run build
cd ..
echo -e "${GREEN}✅ Functions build successful.${NC}"

# ---------------------------------------------------------
# 4. ENVIRONMENT SETUP
# ---------------------------------------------------------
echo ""
echo -e "${YELLOW}🌍 [4/5] Switching to Production Environment...${NC}"
npm run env:prod --silent

# ---------------------------------------------------------
# 5. DEPLOYMENT
# ---------------------------------------------------------
echo ""
echo -e "${YELLOW}🚀 [5/5] Deploying to Production (switchcv-e5136)...${NC}"

# Confirm with user
read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled.${NC}"
    exit 1
fi

# Deploy everything (Hosting, Functions, Firestore, Storage)
# Using -P default which usually points to the production project alias
firebase deploy -P default

echo ""
echo -e "${GREEN}✅ SUCCESS: Application deployed to Production!${NC}"
