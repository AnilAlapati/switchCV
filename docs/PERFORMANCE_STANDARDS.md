# Switch CV Performance Standards

This document outlines the standard architecture and implementation patterns for ensuring high performance across the Switch CV application. All new pages and features should adhere to these guidelines.

## 1. Core Principles
- **Progressive Loading**: Never show a full-screen spinner. Show layout structure (Skeleton) immediately.
- **Cache-First**: Fetch data using Stale-While-Revalidate (SWR). Show cached data instantly while updating in the background.
- **Efficiency**: Minimize Firestore reads by caching API responses both in the browser (HTTP Headers) and in memory (SWR).

## 2. Implementation Pattern

### A. Data Fetching (SWR Hooks)
Do not call `fetch()` directly in page components. Create a custom hook in `@/hooks` that wraps `useSWR`.

**Template:**
```typescript
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";

export function useFeatureData(params) {
  const { user } = useAuth();
  
  // 1. Construct cache key (null = don't fetch)
  const key = user ? \`/api/feature/\${params.id}\` : null;

  // 2. Fetcher function
  const fetcher = (url) => fetch(url).then(r => {
    if (!r.ok) throw new Error("Fetch error");
    return r.json();
  });

  // 3. SWR Call
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    dedupingInterval: 60000, // 1 minute (adjust based on volatility)
    revalidateOnFocus: false, // Optional: disable for static-ish data
    keepPreviousData: true,   // Keep showing old data while fetching new
  });

  return {
    data,
    loading: isLoading,
    error,
    mutate
  };
}
```

### B. Loading States (Skeletons)
Create a `FeatureSkeleton.tsx` component that mirrors the layout of the loaded state.
- Use `animate-pulse` and bg colors like `bg-slate-200` or `bg-[#2C4A3B]/10`.
- Match height and width of text blocks.
- **Rule**: If a page has a grid of cards, the skeleton should contain a grid of skeleton cards.

### C. Page Component Structure
```tsx
export default function FeaturePage() {
  const { data, loading } = useFeatureData();

  // 1. Show skeleton if loading AND no data
  if (loading && !data) {
    return <FeatureSkeleton />;
  }

  // 2. Render content
  return (
    <div>
      {/* ... content ... */}
    </div>
  );
}
```

### D. API Cache Headers
Add standard `Cache-Control` headers to all `GET` routes in `route.ts`.

**Standard Header:**
```typescript
return NextResponse.json(data, {
  headers: {
    // browser cache for 60s, stale allowed for 5 mins
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
  }
});
```
- Use `private` for user-specific data.
- Use `public` for generic data (like templates).

## 3. Checklist for New Pages
- [ ] Created/Updated SWR hook?
- [ ] Created Skeleton component matching design?
- [ ] Added `Cache-Control` headers to API?
- [ ] Verified no "flicker" on navigation (SWR cache working)?
- [ ] Verified `npm run build` passes?

## 4. Automated Verification
We have established a script to automatically check for compliance with these standards.

Run the audit script before pushing changes:
```bash
npm run audit:perf
```

This script checks for:
- Missing `Cache-Control` headers in `GET` API routes.
- Usage of `fetch` inside `useEffect` in Page components (manual fetching).
- Presence of SWR or Skeleton usage via heuristics.
