#!/bin/bash

# Secret Rotation Script for Firebase Secret Manager
# Usage: ./scripts/rotate-secret.sh SECRET_NAME "NEW_VALUE"
# Example: ./scripts/rotate-secret.sh GEMINI_API_KEY "AIza..."

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${FIREBASE_PROJECT_ID:-"switchcv-dev"}
ROTATED_BY=$(git config user.email || echo "unknown")
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
VERSION=$(date +%Y%m%d%H%M%S)

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Error: Missing arguments${NC}"
    echo ""
    echo "Usage: $0 SECRET_NAME NEW_VALUE"
    echo ""
    echo "Examples:"
    echo "  $0 GEMINI_API_KEY 'AIza...'"
    echo "  $0 TOKEN_SECRET \$(openssl rand -hex 64)"
    echo ""
    exit 1
fi

SECRET_NAME=$1
NEW_VALUE=$2

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Firebase Secret Rotation Tool                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Secret:${NC}      $SECRET_NAME"
echo -e "${CYAN}Project:${NC}     $PROJECT_ID"
echo -e "${CYAN}Rotated By:${NC}  $ROTATED_BY"
echo -e "${CYAN}Timestamp:${NC}   $TIMESTAMP"
echo -e "${CYAN}Version:${NC}     $VERSION"
echo ""

# Validation
echo -e "${YELLOW}🔍 Validating secret...${NC}"

# Check secret name is valid
VALID_SECRETS=("GEMINI_API_KEY" "OPENAI_API_KEY" "GROQ_API_KEY" "HUGGINGFACE_TOKEN" "TOKEN_SECRET" "FIREBASE_ADMIN_SDK_KEY")
if [[ ! " ${VALID_SECRETS[@]} " =~ " ${SECRET_NAME} " ]]; then
    echo -e "${RED}❌ Invalid secret name: $SECRET_NAME${NC}"
    echo -e "${YELLOW}Valid secrets: ${VALID_SECRETS[*]}${NC}"
    exit 1
fi

# Check minimum length requirements
MIN_LENGTH=32
if [ "$SECRET_NAME" = "TOKEN_SECRET" ]; then
    MIN_LENGTH=64
elif [ "$SECRET_NAME" = "FIREBASE_ADMIN_SDK_KEY" ]; then
    MIN_LENGTH=100
fi

if [ ${#NEW_VALUE} -lt $MIN_LENGTH ]; then
    echo -e "${RED}❌ Secret value too short (minimum: $MIN_LENGTH characters)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Secret validation passed${NC}"
echo ""

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will rotate $SECRET_NAME in project $PROJECT_ID${NC}"
echo -e "${YELLOW}⚠️  The old version will remain accessible but marked as deprecated${NC}"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}❌ Rotation cancelled${NC}"
    exit 0
fi

# Step 1: Create backup of current version
echo -e "${BLUE}📦 Step 1/4: Backing up current version...${NC}"
CURRENT_VALUE=$(firebase functions:secrets:access "$SECRET_NAME" --project "$PROJECT_ID" 2>/dev/null || echo "")
if [ -n "$CURRENT_VALUE" ]; then
    BACKUP_FILE=".secrets/backup_${SECRET_NAME}_${VERSION}.txt"
    mkdir -p .secrets
    echo "$CURRENT_VALUE" > "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup saved to: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No existing value found (new secret)${NC}"
fi
echo ""

# Step 2: Set new secret value
echo -e "${BLUE}🔐 Step 2/4: Setting new secret value...${NC}"
echo -n "$NEW_VALUE" | firebase functions:secrets:set "$SECRET_NAME" \
    --project "$PROJECT_ID" \
    --data-file - \
    2>&1 | tee /tmp/firebase-secret-output.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ Secret value updated in Firebase Secret Manager${NC}"
else
    echo -e "${RED}❌ Failed to set secret value${NC}"
    cat /tmp/firebase-secret-output.log
    exit 1
fi
echo ""

# Step 3: Update metadata
echo -e "${BLUE}📝 Step 3/4: Updating metadata...${NC}"
METADATA=$(cat <<EOF
{
  "lastRotated": "$TIMESTAMP",
  "rotatedBy": "$ROTATED_BY",
  "version": "$VERSION",
  "previousVersion": "$(firebase functions:secrets:access "${SECRET_NAME}_METADATA" --project "$PROJECT_ID" 2>/dev/null | jq -r '.version // "none"' 2>/dev/null || echo "none")"
}
EOF
)

echo "$METADATA" | firebase functions:secrets:set "${SECRET_NAME}_METADATA" \
    --project "$PROJECT_ID" \
    --data-file - \
    2>&1 > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Metadata updated${NC}"
    echo "$METADATA" | jq '.'
else
    echo -e "${YELLOW}⚠️  Failed to update metadata (non-critical)${NC}"
fi
echo ""

# Step 4: Verify rotation
echo -e "${BLUE}✅ Step 4/4: Verifying rotation...${NC}"
VERIFY_VALUE=$(firebase functions:secrets:access "$SECRET_NAME" --project "$PROJECT_ID" 2>/dev/null || echo "")
if [ "$VERIFY_VALUE" = "$NEW_VALUE" ]; then
    echo -e "${GREEN}✓ Secret rotation verified successfully${NC}"
else
    echo -e "${RED}❌ Verification failed - secret value mismatch${NC}"
    exit 1
fi
echo ""

# Log rotation event
LOG_FILE="logs/secret-rotations.log"
mkdir -p logs
echo "$TIMESTAMP | $SECRET_NAME | $ROTATED_BY | $VERSION" >> "$LOG_FILE"

# Success summary
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ ROTATION SUCCESSFUL                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Secret Name:${NC}     $SECRET_NAME"
echo -e "${CYAN}New Version:${NC}     $VERSION"
echo -e "${CYAN}Rotated By:${NC}      $ROTATED_BY"
echo -e "${CYAN}Timestamp:${NC}       $TIMESTAMP"
echo -e "${CYAN}Backup:${NC}          ${BACKUP_FILE:-N/A}"
echo -e "${CYAN}Log:${NC}             $LOG_FILE"
echo ""

# Next steps
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "1. ${CYAN}Deploy Cloud Functions:${NC}"
echo -e "   cd functions && npm run build && firebase deploy --only functions --project $PROJECT_ID"
echo ""
echo -e "2. ${CYAN}Test secret access:${NC}"
echo -e "   npm run test:api-keys"
echo ""
echo -e "3. ${CYAN}Update .env.local (optional for local dev):${NC}"
echo -e "   ./scripts/sync-secrets-from-firebase.sh $PROJECT_ID"
echo ""
echo -e "4. ${CYAN}Verify in production:${NC}"
echo -e "   Check Cloud Functions logs after deployment"
echo ""

# Cleanup
rm -f /tmp/firebase-secret-output.log

echo -e "${GREEN}✨ Secret rotation complete!${NC}"
