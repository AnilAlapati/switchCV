# Security Architecture: Cloud Run & Firebase

## Cloud Run IAM Configuration

### Why `allUsers` is Required for SwitchCV

The Cloud Run service `ssrswitchcve5136` hosts the Next.js SSR application. It **must** allow unauthenticated access (`allUsers` with `roles/run.invoker`) because:

1. **It's a public website** - Users need to access the landing page, auth page, and public routes without any IAM credentials
2. **Firebase Hosting proxies to Cloud Run** - Firebase Hosting doesn't pass IAM auth headers

### Security Model Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Internet (Public)                                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Cloud Run SSR Function (allUsers = allowed)                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Next.js Application                                            ││
│  │  ┌─────────────────────────┐  ┌────────────────────────────────┐││
│  │  │  PUBLIC ROUTES          │  │  PROTECTED ROUTES              │││
│  │  │  ─────────────────      │  │  ─────────────────             │││
│  │  │  • / (landing)          │  │  • /dashboard/* (auth required)│││
│  │  │  • /auth                │  │  • /api/resumes (Firebase Auth)│││
│  │  │  • /api/health          │  │  • /api/profiles (Auth + Rules)│││
│  │  │  • /maintenance         │  │  • /api/ai/* (App Check)       │││
│  │  └─────────────────────────┘  └────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Firebase Security Layers                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐│
│  │ Firebase Auth   │ │ Firestore Rules │ │ Rate Limiting (proxy.ts)││
│  │ (JWT tokens)    │ │ (per-document)  │ │ (IP-based)             ││
│  └─────────────────┘ └─────────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Where Real Security Happens

| Layer | Protection | Location |
|-------|------------|----------|
| **Firebase Auth** | User identity verification | Client + API routes |
| **Firestore Rules** | Document-level access control | `firestore.rules` |
| **API Middleware** | Auth token validation | Each API route |
| **App Check** | Bot protection for AI routes | `/api/ai/*` routes |
| **Rate Limiting** | DDoS protection | `src/proxy.ts` |
| **CSP Headers** | XSS protection | `next.config.ts` |

### IAM Command Reference

```bash
# Check current IAM policy
gcloud run services get-iam-policy ssrswitchcve5136 \
  --region=us-central1 --project=switchcv-e5136

# Allow public access (required for website)
gcloud run services add-iam-policy-binding ssrswitchcve5136 \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region=us-central1 \
  --project=switchcv-e5136

# Remove public access (NOT RECOMMENDED - breaks website)
gcloud run services remove-iam-policy-binding ssrswitchcve5136 \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region=us-central1 \
  --project=switchcv-e5136
```

---

## Troubleshooting

### Issue: 403 Forbidden on All Routes

**Cause**: Cloud Run function requires IAM authentication (missing `allUsers` binding)

**Fix**: Run the IAM binding command above

**Last fixed**: January 16, 2026 - Function was redeployed by Firebase without `allUsers` permission
