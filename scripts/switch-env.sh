#!/bin/bash

# Switch Environment Script
# Usage: ./scripts/switch-env.sh [dev|prod]

ENV=$1

if [ "$ENV" == "dev" ]; then
    echo "🔄 Switching to DEV environment (switchcv-dev)..."
    cp .env.dev .env.local
    firebase use dev
    echo "✅ Switched to DEV."
elif [ "$ENV" == "prod" ]; then
    echo "⚠️  Switching to PROD environment (switchcv-e5136)..."
    echo "   (Using .env.local.prod-db)"
    cp .env.local.prod-db .env.local
    firebase use default
    echo "✅ Switched to PROD."
else
    echo "Usage: ./scripts/switch-env.sh [dev|prod]"
    exit 1
fi
