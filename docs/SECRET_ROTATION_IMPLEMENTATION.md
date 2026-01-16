# Firebase Secret Manager Implementation Plan

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 4-5 hours  
**Status:** Ready for Implementation  
**Date:** January 8, 2026

---

## Overview

Migrate from `.env.local` to Firebase Secret Manager with automated rotation strategy to improve security posture and enable secret versioning.

### Current State

- Secrets stored in `.env.local` files (not version controlled)
- Manual secret sync via `scripts/sync-secrets-from-firebase.sh`
- No rotation mechanism or expiration tracking
- Mixed access patterns: `process.env.*` throughout codebase
- Basic secret fetching exists but no comprehensive management

### Target State

- All secrets in Firebase Secret Manager with automatic rotation
- Version-controlled secret definitions (not values)
- Centralized secret access service with caching
- Automatic rotation reminders and enforcement
- Audit logging for secret access
- Development/staging/production secret separation

---

## Secrets Inventory

### Critical Secrets (Require Rotation)

| Secret Name              | Current Location | Usage                    | Rotation Period |
| ------------------------ | ---------------- | ------------------------ | --------------- |
| `GEMINI_API_KEY`         | `.env.local`     | AI generation (primary)  | 90 days         |
| `OPENAI_API_KEY`         | `.env.local`     | AI generation (fallback) | 90 days         |
| `GROQ_API_KEY`           | `.env.local`     | AI generation (fallback) | 90 days         |
| `HUGGINGFACE_TOKEN`      | `.env.local`     | AI generation (optional) | 90 days         |
| `TOKEN_SECRET`           | `.env.local`     | JWT signing              | 30 days         |
| `FIREBASE_ADMIN_SDK_KEY` | `.env.local`     | Admin SDK                | 180 days        |

### Non-Rotating Secrets

| Secret Name              | Current Location | Usage      | Notes                       |
| ------------------------ | ---------------- | ---------- | --------------------------- |
| `NEXT_PUBLIC_FIREBASE_*` | `.env.local`     | Client SDK | Public configs, not secrets |

---

## Implementation Plan

### Phase 1: Infrastructure Setup (1-2 hours)

#### 1.1 Create Secret Management Service

```typescript
// src/lib/services/secretManagerService.ts
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

interface SecretMetadata {
  name: string;
  lastRotated: Date;
  rotationPeriod: number; // days
  nextRotation: Date;
  version: string;
}

export class SecretManagerService {
  private client: SecretManagerServiceClient;
  private cache: Map<string, { value: string; expiry: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getSecret(name: string): Promise<string>;
  async rotateSecret(name: string, newValue: string): Promise<void>;
  async checkRotationStatus(): Promise<SecretMetadata[]>;
  async scheduleRotation(name: string): Promise<void>;
}
```

#### 1.2 Deploy Secrets to Firebase Secret Manager

```bash
# Create new secrets in Firebase Secret Manager
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GROQ_API_KEY
firebase functions:secrets:set HUGGINGFACE_TOKEN
firebase functions:secrets:set TOKEN_SECRET
firebase functions:secrets:set FIREBASE_ADMIN_SDK_KEY

# Set rotation metadata
firebase functions:secrets:set GEMINI_API_KEY_METADATA --data-file secrets/gemini-metadata.json
```

#### 1.3 Update Firebase Functions Deployment

```typescript
// functions/src/index.ts
import { defineSecret } from "firebase-functions/params";

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const openaiApiKey = defineSecret("OPENAI_API_KEY");
const groqApiKey = defineSecret("GROQ_API_KEY");
const tokenSecret = defineSecret("TOKEN_SECRET");

export const generateResume = onRequest(
  { secrets: [geminiApiKey, groqApiKey, openaiApiKey] },
  async (req, res) => {
    // Access via: geminiApiKey.value()
  }
);
```

---

### Phase 2: Code Migration (2 hours)

#### 2.1 Update Environment Access Pattern

**Before:**

```typescript
const apiKey = process.env.GEMINI_API_KEY;
```

**After:**

```typescript
import { getSecret } from "@/lib/services/secretManagerService";

const apiKey = await getSecret("GEMINI_API_KEY");
```

#### 2.2 Files to Update (20 matches total)

**Frontend (Next.js):**

- `src/lib/services/aiGenerationService.ts` (2 occurrences)
- `src/server/services/aiProviderService.ts` (2 occurrences)
- `src/lib/tokenGenerator.ts` (2 occurrences)

**Backend (Cloud Functions):**

- `functions/src/indexResumeService.ts` (1 occurrence)
- `functions/src/searchResumeService.ts` (1 occurrence)
- `functions/src/resumeService.ts` (2 occurrences)
- `functions/src/config/index.ts` (2 occurrences)

**Tests (Keep process.env for mocking):**

- Keep test files unchanged - they should mock at the service layer

#### 2.3 Configuration Updates

```typescript
// functions/src/lib/configLoader.ts
import { defineSecret } from "firebase-functions/params";

export class ConfigLoader {
  private secrets = {
    geminiApiKey: defineSecret("GEMINI_API_KEY"),
    openaiApiKey: defineSecret("OPENAI_API_KEY"),
    groqApiKey: defineSecret("GROQ_API_KEY"),
    tokenSecret: defineSecret("TOKEN_SECRET"),
  };

  async getSecret(name: keyof typeof this.secrets): Promise<string> {
    return this.secrets[name].value();
  }
}
```

---

### Phase 3: Rotation Automation (1-2 hours)

#### 3.1 Create Rotation Scheduler Cloud Function

```typescript
// functions/src/scheduled/secretRotation.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { SecretManagerService } from "../lib/secretManagerService";

export const checkSecretRotation = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "America/New_York",
  },
  async (event) => {
    const secretManager = new SecretManagerService();
    const secrets = await secretManager.checkRotationStatus();

    const expiringSoon = secrets.filter(
      (s) => s.nextRotation.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
    );

    if (expiringSoon.length > 0) {
      await sendRotationAlert(expiringSoon);
    }
  }
);
```

#### 3.2 Create Rotation Notification System

```typescript
// functions/src/services/secretRotationService.ts
export async function sendRotationAlert(secrets: SecretMetadata[]) {
  // Send email to admin
  const mailOptions = {
    from: "alerts@switchcv.app",
    to: "admin@switchcv.app",
    subject: `[SECURITY] ${secrets.length} Secrets Require Rotation`,
    html: generateRotationEmail(secrets),
  };

  await transporter.sendMail(mailOptions);

  // Log to Firestore for audit trail
  await db.collection("secretRotationAlerts").add({
    secrets: secrets.map((s) => ({
      name: s.name,
      nextRotation: s.nextRotation,
    })),
    alertedAt: new Date(),
    status: "pending",
  });
}
```

#### 3.3 Create Manual Rotation Script

```bash
#!/bin/bash
# scripts/rotate-secret.sh

SECRET_NAME=$1
NEW_VALUE=$2

echo "🔄 Rotating secret: $SECRET_NAME"

# Create new version in Secret Manager
firebase functions:secrets:set "$SECRET_NAME" --data-file <(echo -n "$NEW_VALUE")

# Update rotation metadata
METADATA=$(cat <<EOF
{
  "lastRotated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rotatedBy": "$(git config user.email)",
  "version": "$(date +%Y%m%d%H%M%S)"
}
EOF
)

echo "$METADATA" | firebase functions:secrets:set "${SECRET_NAME}_METADATA"

echo "✅ Secret rotated successfully"
echo "🚀 Deploy functions to use new version: npm run deploy:functions"
```

---

### Phase 4: Security Enhancements (30 min - 1 hour)

#### 4.1 Add Secret Access Auditing

```typescript
// src/lib/services/secretManagerService.ts
private async logSecretAccess(secretName: string, userId?: string) {
  await db.collection('secretAccessLogs').add({
    secretName,
    accessedBy: userId || 'system',
    accessedAt: new Date(),
    environment: process.env.NODE_ENV,
  });
}
```

#### 4.2 Implement Secret Caching with TTL

```typescript
async getSecret(name: string): Promise<string> {
  const cached = this.cache.get(name);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  const value = await this.fetchFromSecretManager(name);
  this.cache.set(name, {
    value,
    expiry: Date.now() + this.CACHE_TTL,
  });

  await this.logSecretAccess(name);
  return value;
}
```

#### 4.3 Add Secret Validation

```typescript
export function validateSecretStrength(value: string, type: string): boolean {
  const requirements = {
    API_KEY: { minLength: 32, pattern: /^[A-Za-z0-9_-]+$/ },
    TOKEN_SECRET: { minLength: 64, pattern: /^[A-Za-z0-9]+$/ },
  };

  const req = requirements[type];
  return value.length >= req.minLength && req.pattern.test(value);
}
```

---

## Migration Checklist

### Pre-Migration

- [x] Audit all secrets in `.env.local` and `.env.example`
- [x] Document current secret usage patterns
- [ ] Create Firebase Secret Manager service implementation
- [ ] Set up development/staging/production secret namespaces

### Migration Execution

- [ ] Deploy all secrets to Firebase Secret Manager
- [ ] Update `functions/src/index.ts` with `defineSecret()` calls
- [ ] Update all `process.env.*` references to use `SecretManagerService`
- [ ] Update CI/CD pipelines to use Firebase secrets
- [ ] Update documentation (`docs/ENV_VARIABLES.md`)

### Post-Migration

- [ ] Test secret access in development
- [ ] Test secret access in staging
- [ ] Deploy to production
- [ ] Remove secrets from `.env.local` (keep `.env.example` as template)
- [ ] Set up rotation schedule Cloud Function
- [ ] Test rotation alert system
- [ ] Document rotation procedures

### Rollback Plan

- [ ] Keep `.env.local.backup` for 30 days
- [ ] Maintain dual-access pattern during transition (process.env fallback)
- [ ] Monitor error rates for 7 days post-migration

---

## Testing Strategy

### Unit Tests

```typescript
// src/__tests__/lib/services/secretManagerService.test.ts
describe("SecretManagerService", () => {
  it("should cache secrets with TTL", async () => {
    const service = new SecretManagerService();
    const value1 = await service.getSecret("GEMINI_API_KEY");
    const value2 = await service.getSecret("GEMINI_API_KEY");

    expect(value1).toBe(value2);
    expect(mockSecretManager.accessSecretVersion).toHaveBeenCalledTimes(1);
  });

  it("should invalidate cache after TTL", async () => {
    jest.useFakeTimers();
    const service = new SecretManagerService();

    await service.getSecret("GEMINI_API_KEY");
    jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
    await service.getSecret("GEMINI_API_KEY");

    expect(mockSecretManager.accessSecretVersion).toHaveBeenCalledTimes(2);
  });
});
```

### Integration Tests

```typescript
// e2e/integration/secret-rotation.spec.ts
test("secret rotation workflow", async () => {
  // 1. Create secret
  await firebase.functions().secrets.set("TEST_SECRET", "value1");

  // 2. Access secret
  const value1 = await getSecret("TEST_SECRET");
  expect(value1).toBe("value1");

  // 3. Rotate secret
  await rotateSecret("TEST_SECRET", "value2");

  // 4. Access new secret (after cache expiry)
  await new Promise((resolve) => setTimeout(resolve, 6 * 60 * 1000));
  const value2 = await getSecret("TEST_SECRET");
  expect(value2).toBe("value2");
});
```

---

## Cost Analysis

### Firebase Secret Manager Pricing

- **Secret Versions:** $0.06 per active secret version per month
- **Access Operations:** $0.03 per 10,000 operations

**Estimated Monthly Cost:**

- 6 secrets × 2 versions (current + previous) = 12 versions
- 12 × $0.06 = $0.72/month
- 10k API calls/day × 30 days = 300k operations
- 300k / 10k × $0.03 = $0.90/month

**Total:** ~$1.62/month (vs $0 for .env.local but with significant security benefits)

---

## Security Benefits

1. **Rotation Enforcement:** Automatic alerts prevent expired secrets
2. **Audit Trail:** Every secret access logged with user/timestamp
3. **Version Control:** Rollback to previous secret versions if needed
4. **Separation of Concerns:** Dev/staging/prod secrets isolated
5. **No Plaintext Storage:** Secrets never committed to git
6. **Centralized Management:** One source of truth for all secrets
7. **Compliance:** Meets SOC 2, ISO 27001 secret rotation requirements

---

## Rollout Timeline

| Phase                | Duration  | Deliverable                          |
| -------------------- | --------- | ------------------------------------ |
| Infrastructure       | 1-2 hours | SecretManagerService, Firebase setup |
| Code Migration       | 2 hours   | All `process.env` calls migrated     |
| Rotation Automation  | 1-2 hours | Scheduled function, alerts           |
| Testing & Validation | 1 hour    | Unit + integration tests passing     |

**Total:** 5-7 hours (conservative estimate with buffer)

---

## Next Steps

1. **Review this plan** with team for approval
2. **Create feature branch:** `feature/firebase-secret-manager`
3. **Implement Phase 1:** Secret management service
4. **Deploy to development** environment first
5. **Test rotation workflow** in staging
6. **Production rollout** with monitoring

---

## References

- [Firebase Secret Manager Documentation](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [Google Cloud Secret Manager API](https://cloud.google.com/secret-manager/docs)
- [§7.7 CODE_REVIEW_360.md](../CODE_REVIEW_360.md#L795-L813)
- [NIST Secret Rotation Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

---

**Document Version:** 1.0.0  
**Author:** GitHub Copilot  
**Approved By:** [Pending Review]  
**Implementation Start Date:** [TBD]
