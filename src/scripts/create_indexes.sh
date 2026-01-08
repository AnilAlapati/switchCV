#!/bin/bash

# Validate that gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed or not in your PATH."
    echo "Please install the Google Cloud CLI to create vector indexes."
    exit 1
fi

# Check if project ID is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <PROJECT_ID>"
    echo "Please provide your Firebase project ID (e.g., switch-cv-dev or switch-cv-prod)"
    exit 1
fi

PROJECT_ID=$1
echo "Creating Firestore indexes for project: $PROJECT_ID"

# 1. Vector Index for Semantic Search with Filter
# Required for: .where("isPublic", "==", true).findNearest("embedding", ...)
echo "Creating vector index for 'resumes' collection (isPublic ASC + embedding VECTOR)..."
gcloud firestore indexes composite create \
  --project="$PROJECT_ID" \
  --collection-group=resumes \
  --field-config=field-path=isPublic,order=ascending \
  --field-config=field-path=embedding,vector-config='{"dimension":"768","flat": "{}"}' \
  --database="(default)"

# 2. Standard Composite Index for Recruiter Search
# Note: This is also in firestore.indexes.json, but deploying via CLI is safe too.
# Required for: .where("published", "==", true).orderBy("createdAt", "desc")
echo "Creating composite index for 'resumes' collection (published ASC + createdAt DESC)..."
gcloud firestore indexes composite create \
  --project="$PROJECT_ID" \
  --collection-group=resumes \
  --field-config=field-path=published,order=ascending \
  --field-config=field-path=createdAt,order=descending \
  --database="(default)"

echo "Index creation commands submitted. Indexes may take a few minutes to build."
echo "You can check status with: gcloud firestore operations list"
