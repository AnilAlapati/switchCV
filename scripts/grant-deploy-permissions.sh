#!/bin/bash
set -e

PROJECT_ID="switchcv-e5136"
SERVICE_ACCOUNT="firebase-adminsdk-fbsvc@switchcv-e5136.iam.gserviceaccount.com"

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
COMPUTE_SA="972309525341-compute@developer.gserviceaccount.com"
APP_ENGINE_SA="switchcv-e5136@appspot.gserviceaccount.com"
FIREBASE_MODS_SA="service-972309525341@gcp-sa-firebasemods.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$APP_ENGINE_SA" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$FIREBASE_MODS_SA" \
    --role="roles/secretmanager.secretAccessor"

# 10. Grant secret-level access for deployment and runtime service accounts
SECRETS=("HUGGINGFACE_TOKEN" "GEMINI_API_KEY")
SERVICE_ACCOUNTS=("$SERVICE_ACCOUNT" "$COMPUTE_SA" "$APP_ENGINE_SA" "$FIREBASE_MODS_SA")

for SECRET in "${SECRETS[@]}"; do
    for SA in "${SERVICE_ACCOUNTS[@]}"; do
        gcloud secrets add-iam-policy-binding $SECRET \
            --project=$PROJECT_ID \
            --member="serviceAccount:$SA" \
            --role="roles/secretmanager.secretAccessor"
    done
done

echo "✅ Permissions granted successfully!"
