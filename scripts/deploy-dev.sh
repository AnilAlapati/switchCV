#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying to DEV (switchcv-dev)...${NC}"
echo ""

# ---------------------------------------------------------
# 1. ENVIRONMENT SETUP
# ---------------------------------------------------------
echo -e "${YELLOW}🌍 [1/4] Switching to Dev Environment...${NC}"
npm run env:dev --silent

# Set NODE_ENV to development so schedulers are blocked
export NODE_ENV=development
echo -e "${GREEN}✅ NODE_ENV set to development (schedulers will be blocked)${NC}"
echo ""

# ---------------------------------------------------------
# 2. BUILD CLOUD FUNCTIONS
# ---------------------------------------------------------
echo -e "${YELLOW}🏗️  [2/4] Building Cloud Functions...${NC}"
cd functions
if [ ! -d "node_modules" ]; then
    echo "Installing functions dependencies..."
    npm install
fi
npm run build
cd ..
echo -e "${GREEN}✅ Functions build successful${NC}"
echo ""

# ---------------------------------------------------------
# 3. DEPLOY TO FIREBASE
# ---------------------------------------------------------
echo -e "${YELLOW}📦 [3/4] Deploying to Firebase (switchcv-dev)...${NC}"
firebase deploy -P dev --only functions
echo -e "${GREEN}✅ Deployment complete${NC}"
echo ""

# ---------------------------------------------------------
# 4. CLEANUP OLD ARTIFACT IMAGES
# ---------------------------------------------------------
echo -e "${YELLOW}🧹 [4/4] Cleaning up old Artifact Registry images...${NC}"

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}⚠️  gcloud CLI not found, skipping artifact cleanup${NC}"
    echo -e "${YELLOW}   Install: https://cloud.google.com/sdk/docs/install${NC}"
else
    # List images and keep only the latest 2
    IMAGES=$(gcloud artifacts docker images list \
        "us-central1-docker.pkg.dev/switchcv-dev/gcf-artifacts" \
        --sort-by=~CREATE_TIME \
        --limit=999 \
        --format='value(IMAGE)' \
        --project=switchcv-dev 2>/dev/null || echo "")

    if [ ! -z "$IMAGES" ]; then
        IMAGE_COUNT=$(echo "$IMAGES" | wc -l | tr -d ' ')
        DELETE_COUNT=$((IMAGE_COUNT - 3))
        
        if [ "$DELETE_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}  Found $IMAGE_COUNT images, deleting oldest $DELETE_COUNT...${NC}"
            echo "$IMAGES" | tail -n +4 | while read OLD_IMAGE; do
                echo -e "  ${YELLOW}➜${NC} Deleting: $(basename $OLD_IMAGE)"
                gcloud artifacts docker images delete "$OLD_IMAGE" \
                    --delete-tags \
                    --quiet \
                    --project=switchcv-dev 2>/dev/null || echo "    (failed, may already be deleted)"
            done
            echo -e "${GREEN}✅ Cleanup complete - kept latest 3 images${NC}"
        else
            echo -e "${GREEN}✅ Only $IMAGE_COUNT images found - no cleanup needed (limit 3)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No images found or unable to list${NC}"
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Dev deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 Check costs:${NC}"
echo -e "   Artifact Registry: https://console.cloud.google.com/artifacts/docker/switchcv-dev/us-central1/gcf-artifacts"
echo -e "   Billing Dashboard: https://console.cloud.google.com/billing?project=switchcv-dev"
echo ""
echo -e "${YELLOW}💡 Tip: Run './scripts/check-dev-costs.sh' to monitor storage usage${NC}"
