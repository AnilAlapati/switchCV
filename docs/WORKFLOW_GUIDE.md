# SwitchCV Development Workflow Guide

This guide explains how to work with the isolated **Dev** (`switchcv-dev`) and **Prod** (`switchcv-e5136`) environments.

---

## 1. The Golden Rule

**Always stay in Dev mode.**
Only switch to Prod when you are ready to deploy to real users.

---

## 2. Daily Development (Coding & Testing)

When you are building features, fixing bugs, or testing locally:

### Start the App

```bash
npm run dev
```

- **What happens:** Starts the local server at `http://localhost:3000`.
- **Database:** Connects to `switchcv-dev` (Safe Sandbox).
- **Safety:** You can delete users, wipe the DB, or break things without affecting real users.

### Verify Environment

If you are unsure which environment you are in, run:

```bash
npm run env:dev
```

_(This forces your local config to point to the Dev database)_

---

## 3. Deploying Backend Changes (Functions/Rules)

If you modify **Cloud Functions**, **Firestore Rules**, or **Indexes**, you need to deploy them to the cloud to test them.

### The "Sync" Command (Recommended)

Use this command to safely deploy your changes to **BOTH** Dev and Prod automatically:

```bash
npm run deploy:cloud
```

**What this does:**

1.  Deploys to **Dev** first.
2.  If Dev fails -> Stops (Protects Prod).
3.  If Dev succeeds -> Deploys to **Prod**.
4.  Switches your local environment back to **Dev** automatically.

---

## 4. Deploying Frontend (The Website)

When you are ready to update the live website (Vercel/Hosting):

1.  **Commit your code:**
    ```bash
    git add .
    git commit -m "Feature: Amazing new thing"
    git push origin main
    ```
2.  **Vercel/CI** will automatically pick up the change and deploy the frontend to production.

---

## 5. Manual Environment Switching (Advanced)

If you need to manually inspect the Production database or run a script against Prod:

### Switch to Prod

```bash
npm run env:prod
```

- **Warning:** Any script you run now (e.g., `node scripts/delete-all.js`) will affect **REAL DATA**.
- **Visual Check:** Your `.env.local` file will contain `switchcv-e5136`.

### Switch Back to Dev

```bash
npm run env:dev
```

- **Always do this** immediately after you are done with Prod.

---

## Summary Cheat Sheet

| Goal               | Command                |
| :----------------- | :--------------------- |
| **Start Coding**   | `npm run dev`          |
| **Deploy Backend** | `npm run deploy:cloud` |
| **Force Dev Mode** | `npm run env:dev`      |
| **Inspect Prod**   | `npm run env:prod`     |

---

## Monitoring & Alerts

SwitchCV now includes 24/7 monitoring that notifies `support@switchcv.com` automatically:

- **Emergency Alerts:** Any `AlertManager` entry in Firebase Functions also sends an email with subject prefix `[SWITCHCV EMERGENCY] …`. Check that inbox first whenever something feels off.
- **Health Pings:** The GitHub workflow `Production Health Ping` runs every 5 minutes, calling `https://switchcv.com/api/health`. Configure the target host via the `HEALTHCHECK_URL` secret if you need a different environment. Workflow failures raise a GitHub notification + email.
- **Health Endpoint:** `/api/health` now validates Firestore, Gemini, and SMTP connectivity. A `200 OK` means all dependencies responded; `503` indicates which service failed in the JSON payload.
- **Daily Digest:** The `Monitoring Daily Digest` workflow (9:00 UTC) runs `scripts/monitoring/daily-digest.ts` and emails a 24‑hour summary of alerts/metrics to `support@switchcv.com`. Override recipients with the `DIGEST_EMAIL_TO` secret.

> **Setup reminders:** Ensure repository secrets (`HEALTHCHECK_URL`, `SMTP_*`, `DIGEST_EMAIL_TO`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`) are populated in GitHub so the workflows can authenticate and send mail.
