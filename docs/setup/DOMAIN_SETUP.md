# Custom Domain Setup Guide (GoDaddy + Firebase)

## Overview
This guide details how to connect your GoDaddy domain (`switchcv.com`) to your Firebase Hosting project (`switchcv-e5136`).

## Step 1: Firebase Console Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project: **switchcv-e5136**.
3.  Navigate to **Hosting** in the left sidebar.
4.  Click on **"Add custom domain"**.
5.  Enter your domain: `switchcv.com`.
6.  Click **Continue**.
7.  Firebase will provide you with **TXT records** for verification (if needed) or **A records** for the final setup.

## Step 2: GoDaddy DNS Configuration

1.  Log in to your [GoDaddy Domain Control Center](https://dcc.godaddy.com/domains).
2.  Select your domain: `switchcv.com`.
3.  Scroll down to **Additional Settings** and click **Manage DNS**.
4.  **Remove** any existing "Parked" A records.
5.  Add the **A Records** provided by Firebase. They usually look like this (check Firebase for exact IPs):
    *   **Type:** A
    *   **Name:** @
    *   **Value:** `199.36.158.100` (Example IP 1)
    *   **TTL:** 1 Hour
    *   
    *   **Type:** A
    *   **Name:** @
    *   **Value:** `199.36.158.100` (Example IP 2)
    *   **TTL:** 1 Hour

6.  Add a **CNAME Record** for the `www` subdomain:
    *   **Type:** CNAME
    *   **Name:** www
    *   **Value:** `switchcv.com`
    *   **TTL:** 1 Hour

## Step 3: Verification & SSL

1.  Go back to the Firebase Console and click **Finish** or **Verify**.
2.  It may take up to **24-48 hours** for DNS changes to propagate globally, though it often happens within an hour.
3.  Firebase will automatically provision a **free SSL certificate** for your domain. This process can take a few hours after DNS propagation.

## Step 4: Update Application Config

Once the domain is active, update your environment configuration to reflect the new production URL.

1.  Update `next.config.ts` (if you have domain-specific image optimization settings).
2.  Update Firebase Auth (if using Google Sign-In):
    *   Go to **Authentication** -> **Settings** -> **Authorized Domains**.
    *   Add `switchcv.com`.

## Troubleshooting

*   **"Site not found"**: Wait for DNS propagation.
*   **"Connection not secure"**: Wait for SSL certificate provisioning.
*   **Google Sign-in fails**: Ensure the domain is added to "Authorized Domains" in Firebase Auth.
