#!/bin/bash
set -e

# Setup Firebase Secret Manager
# This script adds secrets to Firebase Secret Manager (Google Cloud Secret Manager)
# Usage: ./scripts/setup-firebase-secrets.sh [dev|prod]

ENV=${1:-dev}
PROJECT_ID=""

if [ "$ENV" = "prod" ]; then
  PROJECT_ID="switchcv-e5136"
  echo "🔧 Setting up PRODUCTION secrets for project: $PROJECT_ID"
else
  PROJECT_ID="switchcv-dev"
  echo "🔧 Setting up DEV secrets for project: $PROJECT_ID"
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Set active project
gcloud config set project "$PROJECT_ID"

# Function to create or update secret
create_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2
  
  if [ -z "$SECRET_VALUE" ]; then
    echo "⚠️  Skipping $SECRET_NAME (value not provided)"
    return
  fi
  
  # Check if secret exists
  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo "📝 Updating existing secret: $SECRET_NAME"
    echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --data-file=-
  else
    echo "✅ Creating new secret: $SECRET_NAME"
    echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic" \
      --data-file=-
  fi
  
  # Grant access to Cloud Functions service account
  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || true
    
  # Grant access to Compute Engine default service account (for App Engine/Cloud Run)
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || true
}

echo ""
echo "📋 Enter secrets (press Enter to skip optional ones):"
echo ""

# Read secrets from user input
read -sp "GEMINI_API_KEY (required): " GEMINI_API_KEY
echo ""

read -sp "TOKEN_SECRET (required): " TOKEN_SECRET
echo ""

read -sp "OPENAI_API_KEY (optional): " OPENAI_API_KEY
echo ""

read -sp "GROQ_API_KEY (optional): " GROQ_API_KEY
echo ""

read -sp "HUGGINGFACE_TOKEN (optional): " HUGGINGFACE_TOKEN
echo ""

echo ""
echo "🚀 Creating/updating secrets in Firebase Secret Manager..."
echo ""

# Create secrets
create_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
create_secret "TOKEN_SECRET" "$TOKEN_SECRET"
create_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
create_secret "GROQ_API_KEY" "$GROQ_API_KEY"
create_secret "HUGGINGFACE_TOKEN" "$HUGGINGFACE_TOKEN"

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. For local development, keep using .env.local (automatically falls back)"
echo "  2. For production deployment, secrets will be auto-fetched from Secret Manager"
echo "  3. For Cloud Functions, add to functions/src/index.ts:"
echo "     secrets: ['GEMINI_API_KEY', 'TOKEN_SECRET', ...]"
echo ""
echo "🔍 To verify secrets:"
echo "  gcloud secrets list --project=$PROJECT_ID"
echo "  gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=$PROJECT_ID"
echo ""
