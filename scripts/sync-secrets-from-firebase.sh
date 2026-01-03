#!/bin/bash

# Sync Secrets from Firebase to Local .env.local
# Usage: ./scripts/sync-secrets-from-firebase.sh [project-id]
# Example: ./scripts/sync-secrets-from-firebase.sh switchcv-dev

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine which project to use
PROJECT_ID=${1:-"switchcv-dev"}

echo -e "${BLUE}🔄 Syncing secrets from Firebase project: ${PROJECT_ID}${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found, creating from .env.example${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓ Created .env.local from .env.example${NC}"
    else
        echo -e "${RED}❌ .env.example not found! Cannot create .env.local${NC}"
        exit 1
    fi
fi

# Create backup of current .env.local (remove old backups first)
rm -f .env.local.backup.* 2>/dev/null || true
BACKUP_FILE=".env.local.backup"
cp .env.local "$BACKUP_FILE"
echo -e "${GREEN}✓ Backed up .env.local to ${BACKUP_FILE}${NC}"

# Function to fetch and update secret
fetch_and_update_secret() {
    local key=$1
    
    echo -n "Fetching ${key}... "
    
    # Try to fetch the secret from Firebase
    if value=$(firebase functions:secrets:access "$key" --project "$PROJECT_ID" 2>/dev/null); then
        # Remove the secret if it exists in .env.local and add the new value
        sed -i.tmp "/^${key}=/d" .env.local
        echo "${key}=${value}" >> .env.local
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠️  Not found in Firebase${NC}"
    fi
}

echo ""
echo -e "${BLUE}📥 Fetching secrets...${NC}"

# Fetch all AI API keys
fetch_and_update_secret "GEMINI_API_KEY"
fetch_and_update_secret "OPENAI_API_KEY"
fetch_and_update_secret "GROQ_API_KEY"
fetch_and_update_secret "HUGGINGFACE_TOKEN"

# Clean up temp files
rm -f .env.local.tmp

echo ""
echo -e "${GREEN}✅ Secrets synced successfully!${NC}"
echo ""
echo -e "${BLUE}ℹ️  To use these secrets, restart your dev server:${NC}"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo -e "${BLUE}ℹ️  Backup saved to: ${BACKUP_FILE}${NC}"
