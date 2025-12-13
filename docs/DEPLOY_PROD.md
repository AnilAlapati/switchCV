# Production Deployment Guide

## The "One Command" Deployment

To deploy to production with full safety checks, simply run:

```bash
npm run deploy:prod
```

## What this command does

This script (`scripts/deploy-prod.sh`) automates the entire pipeline to ensure safety:

1.  **🔒 Security Scan**: Runs `git secrets --scan` to ensure no API keys or secrets are in the code. Fails immediately if secrets are found.
2.  **🔍 Code Quality**: Runs `npm run lint` to catch code style and potential error issues.
3.  **✅ Testing**: Runs `npm run test` to ensure all unit tests pass.
4.  **🏗️ Build**: Runs `npm run build` to compile the Next.js application and check for build errors.
5.  **🌍 Environment Switch**: Automatically switches configuration to Production (`.env.production`).
6.  **🚀 Deployment**: Deploys all resources (Hosting, Functions, Firestore, Storage) to the production Firebase project.
7.  **🔄 Cleanup**: Automatically switches back to the Development environment (`.env.dev`) after deployment (success or failure).

## Prerequisites

- You must have `git-secrets` installed (`brew install git-secrets`).
- You must be logged into Firebase CLI (`firebase login`).
- You must have access to the production Firebase project.

## Troubleshooting

- **Security Check Failed**: Run `git secrets --scan` to see which file has secrets. Remove the secret or add the pattern to `.gitignore` / `.gitallowed`.
- **Lint/Test Failed**: Fix the errors in your code.
- **Build Failed**: Check the build logs for errors.

## Emergency Rollback

If a bad deployment occurs:

1.  Go to [Firebase Console](https://console.firebase.google.com/) > Hosting.
2.  Click the three dots on a previous release.
3.  Select **Rollback**.
