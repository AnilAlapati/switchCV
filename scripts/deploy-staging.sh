#!/bin/bash
# Deploy to Staging Environment
# Usage: ./scripts/deploy-staging.sh
#
# Prerequisites:
#   - Firebase CLI installed
#   - "staging" project configured in .firebaserc
#   - Authenticated with `firebase login`

set -euo pipefail

echo "🚀 Deploying to STAGING environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Switch to staging project
firebase use staging

# Build functions
echo "📦 Building Cloud Functions..."
npm --prefix functions run build

# Deploy
echo "🔥 Deploying to Firebase (hosting + functions)..."
firebase deploy --only hosting,functions

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Staging deployment complete!"
echo "🌐 Check: https://switchcv-staging.web.app"
