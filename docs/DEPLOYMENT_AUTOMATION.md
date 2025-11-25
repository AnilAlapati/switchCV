# Deployment Automation Guide

This guide explains how to automate the deployment of SwitchCV using GitHub Actions, eliminating the need for manual `firebase deploy` commands.

## 🚀 How it Works

We use a **GitHub Actions Workflow** defined in `.github/workflows/deploy.yml`.
Every time you push code to the `develop` branch, this workflow automatically:

1.  Checks out your code.
2.  Installs dependencies (`npm ci`).
3.  Builds the Next.js application (`npm run build`).
4.  Authenticates with Google Cloud using **Workload Identity Federation** (Keyless).
5.  Deploys to Firebase Hosting & Cloud Functions.

## 🛠 One-Time Setup (Keyless Security)

We will use **Workload Identity Federation** to let GitHub Actions authenticate with Google Cloud without storing any long-lived secrets (JSON keys). This is the recommended, secure approach.

### 1. Enable APIs

Run these commands in your local terminal (ensure you have `gcloud` installed and logged in):

```bash
gcloud services enable iamcredentials.googleapis.com --project "switchcv-e5136"
```

### 2. Create the Workload Identity Pool & Provider

Run this script to set up the trust relationship between GitHub and Google Cloud:

```bash
# 1. Create the pool
gcloud iam workload-identity-pools create "github-actions" \
  --project="switchcv-e5136" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Create the provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="switchcv-e5136" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 3. Grant Permissions

Allow the GitHub repository to impersonate your Service Account.
_(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)_

```bash
# Get your project number (needed for the member string)
PROJECT_NUMBER=$(gcloud projects describe switchcv-e5136 --format="value(projectNumber)")

# Allow the repository to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "firebase-adminsdk-xxxxx@switchcv-e5136.iam.gserviceaccount.com" \
  --project="switchcv-e5136" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_GITHUB_USERNAME/switchCV"
```

_(Note: You can find your Service Account email in the Google Cloud Console IAM page. It usually looks like `firebase-adminsdk-xxxxx@...`)_

### 4. Add Secrets to GitHub

1.  Go to your GitHub Repository > **Settings** > **Secrets and variables** > **Actions**.
2.  Add the following secrets/variables:
    - `GCP_WORKLOAD_IDENTITY_PROVIDER`: The full name of the provider. You can get it with:
      ```bash
      gcloud iam workload-identity-pools providers describe "github-provider-3" \
        --project="switchcv-e5136" \
        --location="global" \
        --workload-identity-pool="github-actions" \
        --format="value(name)"
      ```
    - `GCP_SERVICE_ACCOUNT`: The email of the service account (e.g., `firebase-adminsdk-fbsvc@switchcv-e5136.iam.gserviceaccount.com`)

## 🔄 How to Deploy

### Production Deployment

Simply push or merge your changes to the `develop` branch.

```bash
git checkout develop
git merge feature/new-feature
git push origin develop
```

The "Deploy to Firebase Hosting on merge" action will start automatically. You can watch its progress in the **Actions** tab of your GitHub repository.

## 🧹 Managing Backups & Storage Costs

Firebase keeps a history of your deployments. While Hosting storage is cheap, the **Container Images** used by Next.js (Cloud Functions) can accumulate in Google Artifact Registry.

### Limit Artifact Versions (Cost Saving)

To prevent storing thousands of old container images, set a **Lifecycle Policy** in Google Cloud.

1.  **Install gcloud CLI** (if not installed).
2.  **Login:** `gcloud auth login`
3.  **Set Project:** `gcloud config set project switchcv-e5136`
4.  **Run this command** to keep only the last 10 images:

```bash
gcloud artifacts repositories set-cleanup-policies \
  gcf-artifacts \
  --location=us-central1 \
  --policy=<(echo '{
  "name": "keep-last-10-versions",
  "action": {"type": "Delete"},
  "condition": {
    "tagState": "ANY",
    "olderThan": "30d"
  },
  "mostRecentVersions": {
    "keepCount": 10
  }
}')
```

_(Note: You may need to adjust the repository name `gcf-artifacts` if it differs in your project. Check `gcloud artifacts repositories list`.)_

## 📝 Workflow File Reference

The current configuration is located at `.github/workflows/deploy.yml`.

```yaml
name: Deploy to Firebase Hosting on merge
on:
  push:
    branches:
      - main
permissions:
  contents: read
  id-token: write
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - id: "auth"
        uses: "google-github-actions/auth@v2"
        with:
          workload_identity_provider: "${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}"
          service_account: "${{ secrets.GCP_SERVICE_ACCOUNT }}"

      - name: Deploy to Firebase
        run: npx firebase-tools deploy --only hosting,functions --project switchcv-e5136
```
