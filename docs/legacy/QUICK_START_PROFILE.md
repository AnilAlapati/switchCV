# 🎯 Quick Start: Profile Search Implementation

## What's Ready Right Now ✅

You have:

- Complete system design
- Data type definitions
- 4 API route starters
- 1 custom hook
- Full documentation

## What to Do Next 👇

### Option A: Start Building Immediately (Recommended)

```
1. Copy the API routes as-is
2. Add authentication (Firebase Auth integration)
3. Build React components using the hooks
4. Test each flow step-by-step
```

### Option B: Copy & Complete Approach

```
1. Copy starter code to your project
2. Follow PROFILE_SEARCH_CHECKLIST.md
3. Complete one phase at a time
4. Test before moving to next phase
```

---

## Files to Review (In Order)

### Phase 1: Understand the System

1. **`PROFILE_SEARCH_DESIGN.md`** (30 min read)

   - What's the feature?
   - How does it work?
   - What are the flows?

2. **`IMPLEMENTATION_SUMMARY.md`** (20 min read)
   - What's been created?
   - What still needs building?
   - Data models and flows

### Phase 2: Set Up

1. Add types to your project

   ```bash
   cp src/types/profileSearch.ts your-project/src/types/
   ```

2. Add API routes

   ```bash
   cp src/app/api/profiles/* your-project/src/app/api/profiles/
   ```

3. Add hooks
   ```bash
   cp src/hooks/useAccessControl.tsx your-project/src/hooks/
   ```

### Phase 3: Complete Auth Integration

Each API route has this TODO:

```typescript
// TODO: Get authenticated user from request
const currentUserId = "placeholder-uid";

// Replace with:
const { getAuth } = await import("firebase/auth");
const auth = getAuth();
const currentUser = auth.currentUser;

if (!currentUser) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const currentUserId = currentUser.uid;
```

### Phase 4: Build Frontend Components

Follow `PROFILE_SEARCH_CHECKLIST.md` Phase 3 for:

- `/profiles/search` page
- `/profiles/[username]` profile page
- Approval dashboard
- Notification components

---

## MVP (Minimum Viable Product)

To get this working in 1 week:

1. ✅ Set up data types
2. ✅ Add API routes (with auth)
3. ⏳ Build search page
4. ⏳ Build request dialog
5. ⏳ Build approval dashboard

---

## Testing Checklist

After building, test these:

```
[ ] Can search for users
[ ] Results show only public info
[ ] "Request Full Resume" button works
[ ] Owner gets notification
[ ] Owner can approve with duration
[ ] Requester gets approval notification
[ ] Can view full resume when approved
[ ] Timer shows expiry countdown
[ ] Access expires correctly
[ ] Can request again after expiry
[ ] Revoke removes access immediately
[ ] Denied request shows message
[ ] No PII in search results
```

---

## Key Code Snippets

### Use the Hook in Your Component

```typescript
import { useAccessControl } from "@/hooks/useAccessControl";

function ApprovalDashboard({ resumeId }: { resumeId: string }) {
  const { pendingRequests, activeGrants, approve, deny, revoke, loading } =
    useAccessControl({ resumeId });

  if (loading) return <div>Loading requests...</div>;

  return (
    <div>
      <h2>Pending Requests ({pendingRequests.length})</h2>
      {pendingRequests.map((request) => (
        <div key={request.requestId}>
          <p>{request.fromUserName}</p>
          <button onClick={() => approve(request.requestId, "1week")}>
            Approve for 1 week
          </button>
          <button onClick={() => deny(request.requestId)}>Deny</button>
        </div>
      ))}

      <h2>Active Grants ({activeGrants.length})</h2>
      {activeGrants.map((grant) => (
        <div key={grant.grantId}>
          <p>Expires: {grant.expiresAt?.toLocaleDateString()}</p>
          <button onClick={() => revoke(grant.grantId)}>Revoke Access</button>
        </div>
      ))}
    </div>
  );
}
```

### Request Access in Component

```typescript
async function handleRequestAccess(resumeId: string) {
  try {
    const response = await fetch("/api/profiles/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId,
        message: "Interested in this role",
      }),
    });

    if (response.ok) {
      alert("✅ Request sent!");
    } else {
      const data = await response.json();
      alert(`❌ ${data.error}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}
```

### Check Access Before Showing Resume

```typescript
import { useEffect, useState } from "react";

function ResumeViewPage({ resumeId }: { resumeId: string }) {
  const [access, setAccess] = useState<AccessCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profiles/check-access?resumeId=${resumeId}`)
      .then((res) => res.json())
      .then((data) => {
        setAccess(data);
        setLoading(false);
      });
  }, [resumeId]);

  if (loading) return <div>Checking access...</div>;

  if (!access?.hasAccess) {
    return (
      <div>
        <p>You don't have access to this resume.</p>
        <button onClick={() => requestAccess()}>Request Full Resume</button>
      </div>
    );
  }

  if (access.expiresAt) {
    const expiresIn = Math.ceil(
      (access.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
    );
    return (
      <div>
        <p>⏰ Access expires in {expiresIn} hours</p>
        {/* Show full resume */}
      </div>
    );
  }

  return <div>{/* Show full resume */}</div>;
}
```

---

## Common Issues & Solutions

| Issue                        | Solution                                           |
| ---------------------------- | -------------------------------------------------- |
| "User not found" in API      | Update APIs with real Firebase Auth                |
| Search returns nothing       | Check Firestore has `publicProfile.visible = true` |
| Can't approve requests       | Verify user is resume owner                        |
| Notifications not showing    | Check notifications collection exists in Firestore |
| Expired grants still visible | Cloud Function to auto-delete expired grants       |

---

## Performance Tips

1. **Search**: Use Algolia or Firestore search extension
2. **Notifications**: Use real-time listeners (already in hook)
3. **Expiry**: Cloud Function cleanup task (daily)
4. **Caching**: Cache search results for 5 minutes
5. **Pagination**: Limit search results to 20-50 per page

---

## Next 3 Hours

1. **Hour 1**: Read design docs (30 min) + copy code to project (30 min)
2. **Hour 2**: Add Firebase Auth to APIs (60 min)
3. **Hour 3**: Build basic search page UI (60 min)

**Result**: Working prototype you can test!

---

## Still Questions?

All answers are in:

- `PROFILE_SEARCH_DESIGN.md` → Full architecture
- `PROFILE_SEARCH_CHECKLIST.md` → Step-by-step implementation
- `IMPLEMENTATION_SUMMARY.md` → This file you're reading

🚀 **Ready to build?** Start with the API routes!
