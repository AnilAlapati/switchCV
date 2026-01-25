#!/bin/bash

# Switch Firebase Project
# Usage: ./scripts/switch-env.sh [dev|prod]
#
# This script only switches the Firebase project context.
# Secrets are fetched from Firebase Secret Manager at runtime - no .env files needed!

ENV=$1

if [ "$ENV" == "dev" ]; then
    echo "🔄 Switching to DEV project (switchcv-dev)..."
    firebase use dev
    echo "✅ Switched to DEV."
    echo ""
    echo "ℹ️  Secrets are fetched from Firebase Secret Manager automatically."
    echo "   For local development, .env.local is used as fallback."
elif [ "$ENV" == "prod" ]; then
    echo "⚠️  Switching to PROD project (switchcv-e5136)..."
    firebase use default
    echo "✅ Switched to PROD."
    echo ""
    echo "ℹ️  Secrets are fetched from Firebase Secret Manager automatically."
    echo "   No .env files needed for production deployment!"
else
    echo "Usage: ./scripts/switch-env.sh [dev|prod]"
    echo ""
    echo "This script switches the active Firebase project."
    echo "Secrets are managed via Firebase Secret Manager."
    exit 1
fi
