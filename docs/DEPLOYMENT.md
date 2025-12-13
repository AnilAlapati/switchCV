# Deployment Guide & Safety Protocols

## Overview

This project uses direct deployment to Firebase (Hosting, Functions, Firestore). Since we do not use a CI/CD pipeline, **local safety checks are critical** to prevent exposing secrets or breaking production.

## 🛡️ Security Pre-Deployment Checklist

Before running any deployment command, ensure:

1.  **No Hardcoded Secrets**: All API keys and tokens must be in environment variables or Firebase Config.
2.  **Scan for Secrets**: Run `git secrets --scan` to verify your code is clean.
3.  **Check `.gitignore`**: Ensure `.env`, `key.json`, and other sensitive files are ignored.
4.  **Verify `firebase.json`**: Ensure the `ignore` list excludes sensitive files from upload.

## 🚀 Deployment Commands

### Standard Deployment (Recommended)

Use the sync script which includes security checks:

```bash
./scripts/deploy-sync.sh
```

### Manual Deployment

If you must deploy manually, **ALWAYS** run a security scan first:

```bash
# 1. Scan for secrets
git secrets --scan

# 2. Deploy (Example)
firebase deploy --only functions
```

## 🔑 Managing Secrets in Production

**DO NOT** rely on `.env` files for production Functions. Use Firebase Config or Secret Manager.

### Setting Secrets (Gen 1 Functions)

```bash
firebase functions:config:set \
    gemini.key="YOUR_KEY" \
    openai.key="YOUR_KEY" \
    huggingface.token="YOUR_TOKEN"
```

### Setting Secrets (Gen 2 Functions / Secret Manager)

```bash
firebase functions:secrets:set GEMINI_API_KEY
# Then access via process.env.GEMINI_API_KEY in code
```

## ⚠️ Re-initializing the Repository

If you delete the `.git` folder to "recreate everything":

1.  Initialize git: `git init`
2.  **Re-install safeguards**:
    ```bash
    git secrets --install
    git secrets --register-aws
    git secrets --add 'AIza[0-9A-Za-z-_]{35}'
    git secrets --add 'sk-[a-zA-Z0-9]{48}'
    # ... add other patterns
    ```

## 🚨 Emergency Rollback

If a bad deployment occurs:

1.  Go to [Firebase Console](https://console.firebase.google.com/) > Hosting.
2.  Click the three dots on a previous release.
3.  Select **Rollback**.
