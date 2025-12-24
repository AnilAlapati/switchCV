# Premium Feature Lock Pattern - Usage Guide

## Overview

SwitchCV uses a **consistent premium feature lock pattern** to gate features behind Premium and Enterprise subscription tiers. This guide explains the recommended patterns and best practices.

## Two Approaches for Feature Gating

### 1. **Full Section Lock (Recommended for Cards/Sections)**

Use `PremiumFeatureLock` component for entire sections, cards, or feature areas. This creates a beautiful overlay with blur effect and upgrade prompt.

**When to use:**

- Entire dashboard cards (like Growth Path/Priority Actions)
- Complete feature sections
- Large UI areas that should be locked

**Example:**

```tsx
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { useUserProfile } from "@/hooks/useUserProfile";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";

export function AnalyticsDashboard() {
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

  const dashboardContent = (
    <section className="glass-panel rounded-3xl p-6">
      {/* Your feature content here */}
      <h2>Analytics Overview</h2>
      <div>Charts and insights...</div>
    </section>
  );

  if (isBasic) {
    return (
      <PremiumFeatureLock
        featureName="Analytics Dashboard"
        description={TIER_RESTRICTION_MESSAGES.ANALYTICS_DASHBOARD}
        className="h-full"
      >
        {dashboardContent}
      </PremiumFeatureLock>
    );
  }

  return dashboardContent;
}
```

**Props:**

- `featureName`: Display name (e.g., "Analytics Dashboard")
- `description`: Message from `TIER_RESTRICTION_MESSAGES`
- `icon`: Optional custom icon (defaults to Lock)
- `className`: Additional styling
- `blurBackground`: Enable/disable blur effect (default: true)
- `disabledOpacity`: Opacity level 0-100 (default: 20)
- `maxDescriptionWidth`: Max width in pixels (default: 200)

### 2. **Individual Element Lock (For Buttons/Actions)**

Use `RestrictedFeature` component for individual buttons, links, or small UI elements. Shows tooltip on hover.

**When to use:**

- Individual buttons (Edit, AI Edit, etc.)
- Menu items
- Action buttons
- Small interactive elements

**Example:**

```tsx
import { RestrictedFeature } from "@/components/ui/RestrictedFeature";

export function ResumeActions() {
  return (
    <div className="flex gap-2">
      <RestrictedFeature messageKey="AI_EDIT" requiredTier="premium">
        <button className="btn-primary">AI Edit</button>
      </RestrictedFeature>

      <button className="btn-secondary">View</button>
    </div>
  );
}
```

**Props:**

- `requiredTier`: "premium" or "enterprise" (default: "premium")
- `messageKey`: Key from `TIER_RESTRICTION_MESSAGES`
- `customMessage`: Override default message
- `showTooltip`: Show/hide tooltip (default: true)
- `tooltipPosition`: "top" | "bottom" | "left" | "right"
- `disabledClassName`: Custom disabled styling
- `onAccessDenied`: Callback when access is denied

## Adding New Restriction Messages

1. Add to [`src/lib/utils/tier-restrictions.ts`](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/utils/tier-restrictions.ts):

```typescript
export const TIER_RESTRICTION_MESSAGES = {
  // ... existing messages
  YOUR_NEW_FEATURE: "Unlock [feature name] with Premium or Enterprise.",
} as const;
```

2. Use the new message key:

```tsx
<PremiumFeatureLock
  featureName="Your Feature"
  description={TIER_RESTRICTION_MESSAGES.YOUR_NEW_FEATURE}
>
  {content}
</PremiumFeatureLock>
```

## Current Restriction Messages

```typescript
AI_EDIT: "AI Edit is available for Premium & Enterprise users only.";
PREMIUM_FEATURE: "This feature is available for Premium & Enterprise users only.";
ENTERPRISE_FEATURE: "This feature is available for Enterprise users only.";
ADVANCED_SEARCH: "Advanced search filters are available for Premium & Enterprise users.";
UNLIMITED_RESUMES: "Unlimited resume creation is available for Premium & Enterprise users.";
EXTENDED_RETENTION: "Extended resume retention is available for Premium & Enterprise users.";
PRIORITY_ACTIONS: "Unlock personalized priority actions with Premium or Enterprise.";
ANALYTICS_DASHBOARD: "Unlock advanced analytics and insights with Premium or Enterprise.";
BULK_ACTIONS: "Unlock bulk actions with Premium or Enterprise.";
CUSTOM_BRANDING: "Unlock custom branding options with Enterprise.";
```

## Checking Access in Code

### Using Hook (for conditional rendering)

```tsx
import { useFeatureAccess } from "@/components/ui/RestrictedFeature";

export function MyComponent() {
  const { hasAccess, restrictionMessage, tier } = useFeatureAccess(
    "premium",
    "AI_EDIT"
  );

  if (!hasAccess) {
    return <div>Please upgrade: {restrictionMessage}</div>;
  }

  return <PremiumFeature />;
}
```

### Using Utility Function

```typescript
import { hasFeatureAccess } from "@/lib/utils/tier-restrictions";

const canUseFeature = hasFeatureAccess(userTier, "premium");
```

## Examples from Codebase

### ✅ Good: PriorityActionsCard (Full Section Lock)

[PriorityActionsCard.tsx](/Users/anilalapati/Development/Switch_cv_Nov_21/src/components/dashboard/PriorityActionsCard.tsx) - Clean overlay pattern with:

- Entire card content extracted to variable
- Conditional wrapper based on tier
- Uses centralized message from `TIER_RESTRICTION_MESSAGES`

### ⚠️ Needs Update: ResumeActionCenter

[ResumeActionCenter.tsx](/Users/anilalapati/Development/Switch_cv_Nov_21/src/components/dashboard/ResumeActionCenter.tsx) - Currently wraps individual buttons with `RestrictedFeature` and manually checks `isBasicUser` inside. Should be simplified.

### ⚠️ Needs Update: ResumeSnapshotCard

[ResumeSnapshotCard.tsx](/Users/anilalapati/Development/Switch_cv_Nov_21/src/components/dashboard/ResumeSnapshotCard.tsx) - Similar pattern to ResumeActionCenter, can be simplified.

## Migration Checklist

When updating components to use the new pattern:

1. ✅ Import `PremiumFeatureLock` or `RestrictedFeature`
2. ✅ Import `TIER_RESTRICTION_MESSAGES`
3. ✅ Use `useUserProfile()` hook for tier checking
4. ✅ Extract content to variable if using `PremiumFeatureLock`
5. ✅ Use message key from `TIER_RESTRICTION_MESSAGES` (no hardcoded strings)
6. ✅ Remove manual opacity/blur/pointer-events styling
7. ✅ Remove manual Lock icon rendering
8. ✅ Remove manual "Upgrade Now" button rendering

## Best Practices

1. **Consistency**: Use the same pattern across similar features
2. **Centralized Messages**: Always use `TIER_RESTRICTION_MESSAGES` keys
3. **No Hardcoding**: Avoid inline restriction messages
4. **User Experience**: Full section locks for large areas, tooltip locks for small elements
5. **Clear Hierarchy**: Premium features should be visually distinct but not hidden
6. **Accessibility**: Lock overlays should maintain readable contrast
7. **Performance**: Use `useUserProfile()` which includes SWR caching

## Testing with Dev Mode

Test premium features using dev mode commands:

```bash
npm run dev:enterprise:recruiter  # Full access
npm run dev:premium              # Premium tier
npm run dev:basic                # See all locks
```

## Questions?

- See [RestrictedFeature.tsx](/Users/anilalapati/Development/Switch_cv_Nov_21/src/components/ui/RestrictedFeature.tsx) for tooltip-based locks
- See [PremiumFeatureLock.tsx](/Users/anilalapati/Development/Switch_cv_Nov_21/src/components/ui/PremiumFeatureLock.tsx) for overlay-based locks
- See [tier-restrictions.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/utils/tier-restrictions.ts) for message management
