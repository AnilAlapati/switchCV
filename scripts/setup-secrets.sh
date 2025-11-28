#!/bin/bash

# Setup Secrets Script
# Usage: ./scripts/setup-secrets.sh

set -e # Exit on error

echo "🔑 Setting up Secrets for switchcv-dev..."

# Read secrets from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ .env.local file not found!"
    exit 1
fi

# Function to set secret if it exists in env
set_secret() {
    local key=$1
    local value=${!1}
    
    if [ -n "$value" ]; then
        echo "Setting $key..."
        # Pipe the value into the command to avoid interactive prompt
        echo "$value" | firebase functions:secrets:set "$key" --project switchcv-dev
    else
        echo "⚠️  Warning: $key not found in .env.local"
    fi
}

set_secret "HUGGINGFACE_TOKEN"
set_secret "GEMINI_API_KEY"
set_secret "GROQ_API_KEY"
set_secret "OPENAI_API_KEY"

echo "✅ Secrets setup complete!"
