# Maintenance Mode Configuration

This guide explains how to control user access to the application during maintenance or upgrades.

## Overview

The application supports two levels of access restriction:
1.  **Registration Disabled**: Prevents new users from signing up. Existing users can still log in.
2.  **Login Disabled**: Prevents all users from logging in.

These are controlled via environment variables in `.env.production` (or `.env.local` for development).

## Configuration Flags

### 1. Disable Registration

To stop new users from creating accounts:

```bash
# .env.production
NEXT_PUBLIC_REGISTRATION_DISABLED=true
```

**Effect:**
- The "Sign Up" tab/link is hidden or disabled.
- Direct access to signup shows a "Registration Closed" message.
- Google Sign-In is hidden on the signup view.

### 2. Disable Login

To stop existing users from logging in:

```bash
# .env.production
NEXT_PUBLIC_LOGIN_DISABLED=true
```

**Effect:**
- The "Sign In" form is replaced with a maintenance message.
- Google Sign-In is hidden on the login view.

## Usage Scenarios

### Scenario A: Soft Maintenance (Current State)
You want to stop new users while you work on the database, but let existing users continue.

```bash
NEXT_PUBLIC_REGISTRATION_DISABLED=true
NEXT_PUBLIC_LOGIN_DISABLED=false
```

### Scenario B: Full Maintenance
You are performing a critical migration and want no one to access the system.

```bash
NEXT_PUBLIC_REGISTRATION_DISABLED=true
NEXT_PUBLIC_LOGIN_DISABLED=true
```

### Scenario C: Normal Operation
Everything is running smoothly.

```bash
NEXT_PUBLIC_REGISTRATION_DISABLED=false
NEXT_PUBLIC_LOGIN_DISABLED=false
```

## Deployment

After changing these variables, you must redeploy the application for them to take effect:

```bash
npm run build
firebase deploy --only hosting
```
