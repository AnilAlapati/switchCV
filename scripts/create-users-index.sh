#!/bin/bash
# Create composite index for users collection (role + lastLoginAt)

PROJECT_ID="switchcv-e5136"

echo "Creating composite index for users collection..."
echo "Project: $PROJECT_ID"

gcloud firestore indexes composite create \
  --project="$PROJECT_ID" \
  --collection-group=users \
  --query-scope=COLLECTION \
  --field-config field-path=role,order=ascending \
  --field-config field-path=lastLoginAt,order=ascending

echo ""
echo "Index creation initiated. It may take a few minutes to build."
echo "Check status at: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
