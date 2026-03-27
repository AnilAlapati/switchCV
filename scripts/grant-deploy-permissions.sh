#!/bin/bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-switchcv-e5136}"
PROJECT_NUMBER="${PROJECT_NUMBER:-972309525341}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-firebase-adminsdk-fbsvc@switchcv-e5136.iam.gserviceaccount.com}"

echo "Granting permissions to $SERVICE_ACCOUNT for project $PROJECT_ID..."

# 1. Cloud Functions Admin (for listing, creating, deleting functions)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudfunctions.admin"

# 2. Cloud Run Admin (required for 2nd Gen functions / Web Frameworks)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/run.admin"

# 3. Artifact Registry Admin (for managing container images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/artifactregistry.admin"

# 4. Firebase Hosting Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/firebasehosting.admin"

# 5. Service Usage Consumer (to list and use APIs)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/serviceusage.serviceUsageConsumer"

# 6. Service Account User (to act as the runtime service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/iam.serviceAccountUser"

# 7. Firebase Extensions Admin (required for deployment checks)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/firebaseextensions.admin"

# 8. Secret Manager Secret Accessor (to read secrets like GEMINI_API_KEY)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

# 9. Grant Secret Accessor to Runtime Service Accounts (Compute & App Engine)
# This is required because the deployment validates that the runtime account has access.
COMPUTE_SA="${COMPUTE_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"
APP_ENGINE_SA="${APP_ENGINE_SA:-${PROJECT_ID}@appspot.gserviceaccount.com}"
FIREBASE_MODS_SA="service-${PROJECT_NUMBER}@gcp-sa-firebasemods.iam.gserviceaccount.com"
GITHUB_ACTIONS_SA="${GITHUB_ACTIONS_SA:-github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com}"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$APP_ENGINE_SA" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$FIREBASE_MODS_SA" \
    --role="roles/secretmanager.secretAccessor"

if gcloud iam service-accounts describe "$GITHUB_ACTIONS_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$GITHUB_ACTIONS_SA" \
        --role="roles/secretmanager.secretAccessor"
fi

# 10. Grant secret-level access for deployment and runtime service accounts
# Keep this list aligned with `functions/src/index.ts` so CI deploy validation
# can resolve every secret referenced by `runWith({ secrets: [...] })`.
SECRETS=(
    "GEMINI_API_KEY"
    "GROQ_API_KEY"
    "OPENAI_API_KEY"
)
SERVICE_ACCOUNTS=("$SERVICE_ACCOUNT" "$COMPUTE_SA" "$APP_ENGINE_SA" "$FIREBASE_MODS_SA")
if gcloud iam service-accounts describe "$GITHUB_ACTIONS_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
    SERVICE_ACCOUNTS+=("$GITHUB_ACTIONS_SA")
fi

for SECRET in "${SECRETS[@]}"; do
    for SA in "${SERVICE_ACCOUNTS[@]}"; do
        gcloud secrets add-iam-policy-binding $SECRET \
            --project=$PROJECT_ID \
            --member="serviceAccount:$SA" \
            --role="roles/secretmanager.secretAccessor"
    done
done

echo "✅ Permissions granted successfully!"
