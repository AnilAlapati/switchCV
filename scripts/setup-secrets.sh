#!/bin/bash

# Setup Secrets Script
# Usage: ./scripts/setup-secrets.sh [project-id]
# Example: ./scripts/setup-secrets.sh switchcv-dev

set -e # Exit on error

# Determine which project to use
PROJECT_ID=${1:-"switchcv-dev"}

echo "🔑 Setting up Secrets for ${PROJECT_ID}..."

# Determine which env file to use based on the current .env.local
# (which was set by switch-env.sh)
if [ -f .env.local ]; then
    echo "📄 Reading secrets from .env.local"
    export $(grep -v '^#' .env.local | xargs)
elif [ -f .env.dev ]; then
    echo "📄 Reading secrets from .env.dev (fallback)"
    export $(grep -v '^#' .env.dev | xargs)
else
    echo "❌ No .env.local or .env.dev file found!"
    echo "   Please run 'npm run env:dev' first or create .env.local"
    exit 1
fi

# Function to set secret if it exists in env
set_secret() {
    local key=$1
    local value=${!1}
    
    if [ -n "$value" ]; then
        echo "Setting $key..."
        # Pipe the value into the command to avoid interactive prompt
        echo "$value" | firebase functions:secrets:set "$key" --project "$PROJECT_ID"
    else
        echo "⚠️  Warning: $key not found in env file"
    fi
}

set_secret "HUGGINGFACE_TOKEN"
set_secret "GEMINI_API_KEY"
set_secret "GROQ_API_KEY"
set_secret "OPENAI_API_KEY"

echo "✅ Secrets setup complete!"
