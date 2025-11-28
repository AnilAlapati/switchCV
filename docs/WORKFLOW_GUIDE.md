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
