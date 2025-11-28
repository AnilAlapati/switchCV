# Dev Environment Setup Guide

This guide explains how to set up a safe, isolated development environment (`switchcv-dev`) that mirrors production but keeps your real user data safe.

## 1. Create Project (Manual Step)

Since we cannot create projects programmatically without special organization permissions, please do this once in the browser:

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Click **"Add project"**.
3.  Name it `switchcv-dev`.
4.  Disable Google Analytics (optional, faster setup).
5.  Click **"Create project"**.

## 2. Enable Services (Manual Step)

Once the project is created, enable these 3 services in the console:

1.  **Authentication:**
    - Go to Build -> Authentication -> Get Started.
    - Enable **Email/Password** and **Google**.
    - **Important:** Go to **Settings** (tab) -> **Authorized domains**.
    - Add `localhost` (if not already there).
    - Add your local IP if testing from other devices (optional).
2.  **Firestore Database:**
    - Go to Build -> Firestore Database -> Create Database.
    - Choose **nam5 (us-central)** location.
    - Start in **Production mode** (our script will deploy the correct rules).
3.  **Storage:**
    - Go to Build -> Storage -> Get Started.
    - Start in **Production mode**.
    - Click Done.

## 3. Run the Setup Script

Now, run this single command in your terminal:

```bash
npm run setup:dev
```

This script will:

1.  Link your local code to the new `switchcv-dev` project.
2.  Deploy your Firestore Rules and Indexes.
3.  Deploy your Cloud Functions.
4.  Initialize the system counters (`init-system.js`).
5.  Seed the resume templates (`seed-templates.js`).

## 4. Final Config

1.  **Upgrade to Blaze:** Go to Project Settings -> Usage and Billing -> Details & Settings -> Modify Plan -> Select **Blaze** (Pay as you go). This is required for Gemini AI to work.
2.  **API Keys:**
    - Create a new `.env.dev` file (copy from `.env.local`).
    - Update `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to `switchcv-dev`.
    - Update other keys if you generated new ones for dev.
    - **Functions Config:** Ensure `functions/.env.dev` exists and contains `WEBSITE_URL=http://localhost:3000` (or your dev URL).

## 5. Switching Environments

- **Work on Dev:** `firebase use dev`
- **Work on Prod:** `firebase use default`
