#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT="switchcv-dev"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 Dev Environment Cost Analysis${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}⚠️  gcloud CLI not found${NC}"
    echo -e "${YELLOW}   Install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# ---------------------------------------------------------
# 1. ARTIFACT REGISTRY IMAGES
# ---------------------------------------------------------
echo -e "${GREEN}🖼️  Artifact Registry Storage:${NC}"
echo ""

IMAGES=$(gcloud artifacts docker images list \
    "us-central1-docker.pkg.dev/${PROJECT}/gcf-artifacts" \
    --project="${PROJECT}" \
    --format='table(IMAGE,SIZE_BYTES,CREATE_TIME.date("%Y-%m-%d %H:%M"))' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$IMAGES"
    echo ""
    
    # Calculate total size
    TOTAL_BYTES=$(gcloud artifacts docker images list \
        "us-central1-docker.pkg.dev/${PROJECT}/gcf-artifacts" \
        --project="${PROJECT}" \
        --format='value(SIZE_BYTES)' 2>/dev/null | awk '{sum += $1} END {print sum}')
    
    if [ ! -z "$TOTAL_BYTES" ] && [ "$TOTAL_BYTES" -gt 0 ]; then
        TOTAL_MB=$((TOTAL_BYTES / 1024 / 1024))
        TOTAL_GB=$(echo "scale=2; $TOTAL_BYTES / 1024 / 1024 / 1024" | bc)
        
        # Artifact Registry pricing: ~$0.10/GB/month (standard storage)
        MONTHLY_COST=$(echo "scale=2; $TOTAL_GB * 0.10" | bc)
        INR_COST=$(echo "scale=2; $MONTHLY_COST * 82.50" | bc)
        
        echo -e "${YELLOW}Total Storage: ${TOTAL_MB} MB (${TOTAL_GB} GB)${NC}"
        echo -e "${YELLOW}Estimated Cost: \$${MONTHLY_COST} USD/month (~₹${INR_COST}/month)${NC}"
        
        if (( $(echo "$INR_COST > 10" | bc -l) )); then
            echo -e "${YELLOW}⚠️  Above ₹10/month target - consider reducing images${NC}"
        else
            echo -e "${GREEN}✅ Within ₹10/month target${NC}"
        fi
    else
        echo -e "${GREEN}✅ Minimal storage usage${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Unable to fetch artifact data${NC}"
fi

echo ""

# ---------------------------------------------------------
# 2. CLOUD SCHEDULER JOBS
# ---------------------------------------------------------
echo -e "${GREEN}⏰ Cloud Scheduler Jobs:${NC}"
echo ""

SCHEDULERS=$(gcloud scheduler jobs list \
    --project="${PROJECT}" \
    --format='table(ID,SCHEDULE,STATE,LAST_RUN_TIME.date("%Y-%m-%d %H:%M"))' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$SCHEDULERS"
    echo ""
    
    JOB_COUNT=$(gcloud scheduler jobs list --project="${PROJECT}" --format='value(ID)' 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$JOB_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found ${JOB_COUNT} scheduler jobs in dev${NC}"
        echo -e "${YELLOW}   These should be blocked by environment guards${NC}"
        echo -e "${YELLOW}   Cost: ~\$0.10/job/month = \$$(echo "scale=2; $JOB_COUNT * 0.10" | bc) USD${NC}"
    else
        echo -e "${GREEN}✅ No active scheduler jobs${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Unable to fetch scheduler data${NC}"
fi

echo ""

# ---------------------------------------------------------
# 3. CLOUD FUNCTIONS
# ---------------------------------------------------------
echo -e "${GREEN}⚡ Cloud Functions:${NC}"
echo ""

FUNCTIONS=$(gcloud functions list \
    --project="${PROJECT}" \
    --gen2 \
    --format='value(NAME)' 2>/dev/null | wc -l | tr -d ' ')

if [ ! -z "$FUNCTIONS" ]; then
    echo -e "  Deployed functions: ${FUNCTIONS}"
    echo -e "  ${YELLOW}Note: Function invocations are free tier (2M/month)${NC}"
else
    echo -e "${YELLOW}⚠️  Unable to fetch function data${NC}"
fi

echo ""

# ---------------------------------------------------------
# 4. SUMMARY & LINKS
# ---------------------------------------------------------
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔗 Quick Links:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Artifact Registry:"
echo -e "    https://console.cloud.google.com/artifacts/docker/${PROJECT}/us-central1/gcf-artifacts"
echo ""
echo -e "  Billing Dashboard:"
echo -e "    https://console.cloud.google.com/billing?project=${PROJECT}"
echo ""
echo -e "  Cloud Functions:"
echo -e "    https://console.cloud.google.com/functions/list?project=${PROJECT}"
echo ""
echo -e "${YELLOW}💡 Tips to reduce costs:${NC}"
echo -e "  1. Keep only 2-3 latest images (automatically cleaned by deploy-dev.sh)"
echo -e "  2. Verify scheduler guards are working (check function logs)"
echo -e "  3. Use local emulator for testing instead of deploying to dev"
echo ""
