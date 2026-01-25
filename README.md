# SwitchCV

A modern resume creation and recruitment platform built with Next.js 16, Firebase, and AI-powered features.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development (no overrides)
npm run dev

# Development with full enterprise access
npm run dev:enterprise:recruiter

# Run tests
npm test

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── app/           # Next.js App Router pages & API routes
├── components/    # React components
├── hooks/         # Custom React hooks
├── lib/           # Services, utilities, Firebase config
├── config/        # App configuration & constants
└── types/         # TypeScript type definitions

functions/         # Firebase Cloud Functions
scripts/           # Utility & maintenance scripts
docs/              # Architecture & deployment docs (See docs/README.md)
```

## ⚠️ SECURITY: Secret Management

**All production secrets are now stored in Firebase Secret Manager** ✅

### Production Deployment (Vercel/Cloud Run)

- **No `.env.production` file needed!**
- Secrets are fetched from Firebase Secret Manager at runtime
- See [Firebase Secret Manager Migration Guide](docs/FIREBASE_SECRET_MANAGER_MIGRATION.md)

### Local Development

- Use `.env.local` (git-ignored) for development
- Automatically falls back when Secret Manager is unavailable
- See `.env.example` for template structure

### Setup Production Secrets (One-time)

```bash
# Add secrets to Firebase Secret Manager
./scripts/setup-firebase-secrets.sh prod

# Verify secrets were created
gcloud secrets list --project=switchcv-e5136
```

### What's Safe vs Unsafe

✅ **Safe to commit:**

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - public project identifier
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - public auth domain
- `NEXT_PUBLIC_GA_ID` - Google Analytics ID

❌ **NEVER commit (even with NEXT*PUBLIC* prefix):**

- `NEXT_PUBLIC_FIREBASE_API_KEY` - authenticates API calls
- `NEXT_PUBLIC_HUGGINGFACE_TOKEN` - authenticates HF requests
- Any token, secret, or key with actual credentials

**For complete details:** [Firebase Secret Manager Migration](docs/FIREBASE_SECRET_MANAGER_MIGRATION.md)

## 📚 Documentation

For complete project documentation, including security audits, coding standards, and quality guides, see the [Documentation Hub](docs/README.md).

- **[Master Index](docs/README.md)**
- **[Quality Guide & Watch Mode](docs/development/QUALITY_GUIDE.md)**
- **[Security Overview](docs/security/OVERVIEW.md)**

## 🔧 Development Mode

Override subscription tiers and roles during local development:

| Command                            | Description                    |
| ---------------------------------- | ------------------------------ |
| `npm run dev`                      | Production-like (no overrides) |
| `npm run dev:enterprise`           | Enterprise tier, real role     |
| `npm run dev:enterprise:recruiter` | Full recruiter access          |
| `npm run dev:enterprise:jobseeker` | Full jobseeker access          |
| `npm run dev:premium`              | Premium tier testing           |
| `npm run dev:basic`                | Basic tier testing             |

> ⚠️ Dev mode is **impossible in production** — hardcoded `NODE_ENV !== 'production'` check.

See [docs/DEV_MODE_GUIDE.md](docs/DEV_MODE_GUIDE.md) for details.

## 🏗️ Architecture

```
Client (Next.js) → Firebase Auth → API Routes → Cloud Functions → Firestore
                                              ↓
                                         Gemini AI (embeddings + generation)
```

**Key Patterns:**

- Circuit breaker + retry for external APIs
- Rate limiting via Firestore
- Structured logging with Pino
- Zod validation on all inputs

See [docs/SYSTEM.md](docs/SYSTEM.md) for full diagrams and architecture deep-dive.

## 💳 Subscription Tiers

| Feature          | Basic      | Premium | Enterprise |
| ---------------- | ---------- | ------- | ---------- |
| Resume Creation  | 1          | 50      | Unlimited  |
| Resume Editing   | ❌         | ✅      | ✅         |
| Retention        | 7 days     | Forever | Forever    |
| AI Search        | ❌         | 50/mo   | Unlimited  |
| Contact Requests | 2 lifetime | 50/mo   | Unlimited  |

## 👥 User Roles

| Role          | Capabilities                   |
| ------------- | ------------------------------ |
| **jobseeker** | Create/manage own resume       |
| **recruiter** | AI search, request contacts    |
| **admin**     | All features + admin dashboard |

## 🚢 Deployment

Run the production deployment script for a safe release:

```bash
npm run deploy:prod
```

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for the full guide and checklists.

## 🔐 Environment Variables

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
GEMINI_API_KEY=your-gemini-key
```

See [docs/ENV_VARIABLES.md](docs/ENV_VARIABLES.md) for a full reference of all variables.

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

**Coverage:** 2,489 tests, ~90% coverage

## 📖 Documentation Index

| Feature                                        | Description                                      |
| :--------------------------------------------- | :----------------------------------------------- |
| **[System Architecture](docs/SYSTEM.md)**      | Tech stack, high-level diagrams, and schema.     |
| **[Security & Compliance](docs/SECURITY.md)**  | Auth, PII protection, and vulnerability reports. |
| **[Platform Features](docs/FEATURES.md)**      | AI search, Tier logic, and Feature Locks.        |
| **[Operations & Deploy](docs/OPERATIONS.md)**  | Production release guide and runbook.            |
| **[Troubleshooting](docs/TROUBLESHOOTING.md)** | Google Sign-in fixes and common errors.          |
| **[Development Guide](docs/DEVELOPMENT.md)**   | Local setup and dev-mode overrides.              |

## 🛠️ Key Technologies

- **Frontend:** Next.js 16, React 19, TailwindCSS
- **Backend:** Firebase (Auth, Firestore, Functions)
- **AI:** Google Gemini (embeddings + generation)
- **Testing:** Jest, React Testing Library
- **Logging:** Pino (structured logging)
- **Validation:** Zod

## 📝 API Standards

Use helpers from `@/lib/utils/api-helpers`:

```typescript
import {
  getAuthenticatedUserId,
  verifyResumeOwnership,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    // Your logic
  } catch (err) {
    return handleApiError(err, "Operation failed");
  }
}
```

## License

Private - All rights reserved
