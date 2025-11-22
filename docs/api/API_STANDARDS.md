# API Development Standards

To ensure consistency, security, and maintainability across the Switch CV codebase, all new API routes must adhere to the following standards.

## 1. Authentication & Authorization

**Do not** manually parse headers or verify tokens using `adminAuth.verifyIdToken` directly in your route handlers.

**Do** use the standardized helper functions from `@/lib/utils/api-helpers`.

### `getAuthenticatedUserId`

Use this for any protected route that needs the current user's ID.

```typescript
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  // Proceed with userId...
}
```

### `verifyResumeOwnership`

Use this when an operation targets a specific resume. It handles authentication, fetching the resume, and verifying that the current user owns it.

```typescript
import { verifyResumeOwnership } from "@/lib/utils/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success, error, resumeData, docRef } = await verifyResumeOwnership(
    request,
    params.id
  );
  if (!success) return error;

  // Proceed with update...
}
```

## 2. Error Handling

**Do not** manually construct error responses with `NextResponse.json({ error: ... }, { status: 500 })` inside catch blocks.

**Do** use `handleApiError` to ensure consistent error logging and response formatting.

```typescript
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    // ... logic
  } catch (error) {
    return handleApiError(error, "Failed to fetch data");
  }
}
```

## 3. Response Format

Success responses should generally return JSON.

```typescript
return NextResponse.json({ success: true, data: result });
```

## 4. Testing

When testing API routes, mock the helpers from `@/lib/utils/api-helpers` rather than the internal Firebase logic.

```typescript
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  verifyResumeOwnership: jest.fn(),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));
```
