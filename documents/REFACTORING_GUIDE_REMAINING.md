# Quick Refactoring Guide for Remaining Large Files

## Files Still Needing Refactoring

### 1. Dashboard Access Page (444 lines)

**File:** `src/app/dashboard/access/page.tsx`

**Issues:**

- Multiple state variables (pendingRequests, activeGrants, deniedRequests)
- Two similar useEffect hooks for Firestore listeners
- AccessRequestCard component embedded in same file (150+ lines)
- Grant management logic mixed with request logic

**Refactoring Strategy:**

```
Step 1: Extract useAccessRequests hook
  - Move pendingRequests and deniedRequests logic
  - Create custom hook with real-time listener

Step 2: Extract useAccessGrants hook
  - Move activeGrants logic
  - Handle expiration filtering

Step 3: Create AccessRequestCard component
  - Extract from current ~50 lines in main file
  - Create components/AccessRequestCard.tsx

Step 4: Create AccessGrantCard component
  - Extract grant display logic
  - Create components/AccessGrantCard.tsx

Result: ~250 lines (44% reduction)
```

---

### 2. Recruiter Requests Page (417 lines)

**File:** `src/app/dashboard/recruiter-requests/page.tsx`

**Issues:**

- Request filtering and status management
- Embedded request card components
- Approval/denial action handlers
- Modal/dialog logic for responses

**Refactoring Strategy:**

```
Step 1: Extract useRecruiterRequests hook
  - Real-time request fetching
  - Status filtering logic

Step 2: Extract useRequestActions hook
  - Approve, deny, respond actions
  - Error handling

Step 3: Create RequestCard component

Step 4: Create RequestModal component

Result: ~220 lines (47% reduction)
```

---

### 3. Dashboard Main Page (397 lines)

**File:** `src/app/dashboard/page.tsx`

**Issues:**

- Multiple metrics and statistics
- Profile statistics display
- Real-time stats updates
- Embedded stat cards

**Refactoring Strategy:**

```
Step 1: Extract useDashboardMetrics hook
  - All metrics calculations
  - Real-time updates

Step 2: Create MetricsCard component

Step 3: Create StatisticsPanel component

Step 4: Create ActivityFeed component

Result: ~200 lines (49% reduction)
```

---

## Command Checklists

### After Each Refactoring:

```bash
# 1. Check for TypeScript errors
npm run build

# 2. Check for ESLint issues
npm run lint

# 3. Verify file imports work
grep -r "import.*from" src/app/dashboard/

# 4. Count new line count
wc -l src/app/dashboard/*/page.tsx

# 5. Commit changes
git add .
git commit -m "refactor: split dashboard page into smaller components"
```

---

## Hook Creation Template

```typescript
// hooks/useDashboardData.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(collection(db, "dashboard", user.uid, "data"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(docs);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [user]);

  return { data, loading, error };
};
```

---

## Component Creation Template

```typescript
// components/DashboardCard.tsx
import React from "react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  trend,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {trend && (
        <p
          className={`text-sm mt-2 ${
            trend.direction === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
        </p>
      )}
    </div>
  );
};
```

---

## File Size Targets

**Current Status:**

- Pages > 400 lines: 3 files (444, 417, 397)
- Pages 350-400: 3 files (412, 382, 381)

**Goal After Refactoring:**

- All pages < 250 lines
- Component files 100-200 lines
- Hook files 50-150 lines
- Utility files 30-100 lines

**Progress Tracking:**

```
Current: 3 files > 400 lines = 1,258 total lines
Target: 0 files > 250 lines = ~600 total lines expected
Target Reduction: 52%
```

---

## Common Mistakes to Avoid

1. ❌ Don't extract too aggressively
   - ✅ Extract only truly reusable code
2. ❌ Don't create huge utility files
   - ✅ Split utilities by feature/domain
3. ❌ Don't forget prop drilling
   - ✅ Use Context API or custom hooks for shared state
4. ❌ Don't break existing functionality
   - ✅ Test after each extraction
5. ❌ Don't ignore TypeScript types
   - ✅ Define proper interfaces for extracted components

---

## Success Criteria

✅ File size reduction: Target 50% reduction per page
✅ No build errors: `npm run build` passes
✅ No lint errors: `npm run lint` passes  
✅ Functionality preserved: All features work as before
✅ Test coverage: Tests updated for extracted code
✅ Documentation: Components documented with JSDoc
