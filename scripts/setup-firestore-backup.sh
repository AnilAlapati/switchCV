#!/bin/bash

# Script to setup automated backups for Cloud Firestore
# Usage: ./scripts/setup-firestore-backup.sh [PROJECT_ID] [BUCKET_NAME]

PROJECT_ID=${1:-"switchcv-e5136"}
BUCKET_NAME=${2:-"gs://${PROJECT_ID}-backups"}

echo "🔥 Setting up Firestore Backups for project: $PROJECT_ID"
echo "📦 Backup Bucket: $BUCKET_NAME"

# 1. Create the bucket if it doesn't exist
echo "Creating bucket..."
gcloud storage buckets create $BUCKET_NAME --project=$PROJECT_ID --location=us-central1 || echo "Bucket might already exist, skipping..."

# 2. Configure lifecycle policy (keep backups for 30 days)
echo "Configuring lifecycle policy..."
cat <<EOF > lifecycle.json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }
  ]
}
EOF
gcloud storage buckets update $BUCKET_NAME --lifecycle-file=lifecycle.json
rm lifecycle.json

# 3. Enable Cloud Scheduler API
echo "Enabling Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID

# 4. Create the scheduled job (Daily at midnight)
echo "Creating scheduled job..."
gcloud scheduler jobs create http firestore-daily-backup \
    --schedule="0 0 * * *" \
    --uri="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default):exportDocuments" \
    --message-body="{\"outputUriPrefix\": \"$BUCKET_NAME/daily\"}" \
    --oauth-service-account-email="$PROJECT_ID@appspot.gserviceaccount.com" \
    --location=us-central1 \
    --project=$PROJECT_ID

echo "✅ Backup setup complete! Check Cloud Scheduler in console."
