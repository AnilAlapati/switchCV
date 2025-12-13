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
docs/              # Architecture & deployment docs
```

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

See [docs/ARCHITECTURE_DIAGRAM.md](docs/ARCHITECTURE_DIAGRAM.md) for full diagrams.

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

```bash
# 1. Deploy Firestore indexes (required first)
firebase deploy --only firestore:indexes

# 2. Build & deploy functions
cd functions && npm run build
firebase deploy --only functions

# 3. Deploy frontend
npm run build
# Deploy to Vercel/Firebase Hosting
```

See [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) for full guide.

## 🔐 Environment Variables

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
GEMINI_API_KEY=your-gemini-key
```

### Cloud Functions (`functions/.env.local`)

```bash
GEMINI_API_KEY=your-key
DEV_BYPASS_CHECKS=true  # Emulator only
```

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

**Coverage:** 2,489 tests, ~90% coverage

## 📖 Documentation

| File                                                           | Description                  |
| -------------------------------------------------------------- | ---------------------------- |
| [docs/DEV_MODE_GUIDE.md](docs/DEV_MODE_GUIDE.md)               | Development mode & overrides |
| [docs/ARCHITECTURE_DIAGRAM.md](docs/ARCHITECTURE_DIAGRAM.md)   | System architecture          |
| [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)   | Production deployment        |
| [docs/DEPLOYMENT_AUTOMATION.md](docs/DEPLOYMENT_AUTOMATION.md) | CI/CD with GitHub Actions    |

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
