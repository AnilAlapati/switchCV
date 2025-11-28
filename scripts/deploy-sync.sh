#!/bin/bash
set -e # Exit immediately if any command fails

# Function to ensure we switch back to dev on exit (even if failed)
cleanup() {
    echo ""
    echo "🔄 Ensuring environment is reset to DEV..."
    npm run env:dev --silent
}
trap cleanup EXIT

echo "🚀 Starting Cloud Sync Deployment (Functions, Rules, Indexes)..."

# ---------------------------------------------------------
# 1. DEPLOY TO DEV
# ---------------------------------------------------------
echo ""
echo "📦 [1/2] Deploying to DEV (switchcv-dev)..."
npm run env:dev --silent
# Deploy only backend resources (faster, no frontend build)
firebase deploy -P dev --only functions,firestore,storage

# ---------------------------------------------------------
# 2. DEPLOY TO PROD
# ---------------------------------------------------------
echo ""
echo "⚠️  [2/2] Promoting to PROD (switchcv-e5136)..."
npm run env:prod --silent
# Deploy only backend resources
firebase deploy -P default --only functions,firestore,storage

echo ""
echo "✅ SUCCESS: Cloud changes synced to both environments!"
