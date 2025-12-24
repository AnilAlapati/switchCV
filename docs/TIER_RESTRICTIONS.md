# Tier Restrictions - Centralized Management

## Overview

This document describes the centralized system for managing feature access based on user subscription tiers (Basic, Premium, Enterprise).

## Components

### 1. Tier Restriction Messages (`/src/lib/utils/tier-restrictions.ts`)

**Centralized location for all tier restriction messages.** All restriction text is defined here to ensure consistency across the app.

#### Available Message Keys

```typescript
TIER_RESTRICTION_MESSAGES = {
  AI_EDIT:
    "AI Edit is available for Premium & Enterprise users only. Upgrade to unlock advanced AI-powered resume editing.",
  PREMIUM_FEATURE:
    "This feature is available for Premium & Enterprise users only. Upgrade to unlock more capabilities.",
  ENTERPRISE_FEATURE: "This feature is available for Enterprise users only.",
  ADVANCED_SEARCH:
    "Advanced search filters are available for Premium & Enterprise users.",
  UNLIMITED_RESUMES:
    "Unlimited resume creation is available for Premium & Enterprise users.",
  EXTENDED_RETENTION:
    "Extended resume retention is available for Premium & Enterprise users.",
};
```

#### Utility Functions

- `getTierRestrictionMessage(key)`: Get a specific restriction message
- `hasFeatureAccess(userTier, requiredTier)`: Check if user has access to a feature
- `getFeatureRestrictionMessage(requiredTier)`: Get default message for a tier

### 2. RestrictedFeature Component (`/src/components/ui/RestrictedFeature.tsx`)

**Reusable wrapper component** that automatically handles tier restrictions with tooltips and disabled states.

#### Basic Usage

```tsx
import { RestrictedFeature } from "@/components/ui/RestrictedFeature";

<RestrictedFeature messageKey="AI_EDIT" requiredTier="premium">
  <button>AI Edit</button>
</RestrictedFeature>;
```

#### Props

- `messageKey`: Key from TIER_RESTRICTION_MESSAGES
- `requiredTier`: "premium" | "enterprise" (default: "premium")
- `customMessage`: Override default message
- `showTooltip`: Show/hide tooltip (default: true)
- `tooltipPosition`: "top" | "bottom" | "left" | "right" (default: "top")
- `disabledClassName`: Custom classes for disabled state
- `onAccessDenied`: Callback when access is denied

#### Advanced Examples

```tsx
// Custom message
<RestrictedFeature customMessage="Contact sales for enterprise features">
  <button>Enterprise Only</button>
</RestrictedFeature>

// Enterprise-only feature
<RestrictedFeature messageKey="ENTERPRISE_FEATURE" requiredTier="enterprise">
  <button>Advanced Analytics</button>
</RestrictedFeature>

// Tooltip on bottom
<RestrictedFeature messageKey="AI_EDIT" tooltipPosition="bottom">
  <button>AI Edit</button>
</RestrictedFeature>
```

### 3. useFeatureAccess Hook

**React hook** for checking feature access in functional components.

```tsx
import { useFeatureAccess } from "@/components/ui/RestrictedFeature";

function MyComponent() {
  const { hasAccess, restrictionMessage, tier, isBasic } = useFeatureAccess(
    "premium",
    "AI_EDIT"
  );

  if (!hasAccess) {
    return <div>{restrictionMessage}</div>;
  }

  return <button>AI Edit Available</button>;
}
```

### 4. Enhanced Tooltip Component (`/src/components/ui/Tooltip.tsx`)

**Improved tooltip** with better visibility and positioning.

#### Features

- Multiple position options (top, bottom, left, right)
- Higher z-index (9999) to always appear above other elements
- Better text wrapping and visibility
- Larger max-width (280px)
- Better padding and spacing

#### Usage

```tsx
import { Tooltip } from "@/components/ui/Tooltip";

<Tooltip content="This is a helpful message" position="top">
  <button>Hover me</button>
</Tooltip>;
```

## How to Add/Update Features

### Adding a New Restriction Message

1. Edit `/src/lib/utils/tier-restrictions.ts`
2. Add new key to `TIER_RESTRICTION_MESSAGES`:

```typescript
export const TIER_RESTRICTION_MESSAGES = {
  // ... existing messages
  MY_NEW_FEATURE: "My new feature is available for Premium & Enterprise users.",
} as const;
```

3. Use the new key in components:

```tsx
<RestrictedFeature messageKey="MY_NEW_FEATURE">
  <button>My Feature</button>
</RestrictedFeature>
```

### Updating an Existing Message

1. Edit `/src/lib/utils/tier-restrictions.ts`
2. Update the message text
3. **That's it!** All components using that message key will automatically show the updated text.

### Removing a Restriction

Simply remove the `<RestrictedFeature>` wrapper from the component:

```tsx
// Before (restricted)
<RestrictedFeature messageKey="AI_EDIT">
  <button>AI Edit</button>
</RestrictedFeature>

// After (unrestricted)
<button>AI Edit</button>
```

## Migration Guide

### Old Pattern (❌ Don't use)

```tsx
const isBasicUser = tier === "basic";

{
  isBasicUser ? (
    <Tooltip content="Available for Premium & Enterprise users">
      <button disabled>Feature</button>
    </Tooltip>
  ) : (
    <button>Feature</button>
  );
}
```

### New Pattern (✅ Use this)

```tsx
<RestrictedFeature messageKey="PREMIUM_FEATURE">
  {isBasicUser ? <button disabled>Feature</button> : <button>Feature</button>}
</RestrictedFeature>
```

## Currently Updated Components

The following components now use the centralized system:

1. `/src/components/dashboard/ResumeSnapshotCard.tsx`
2. `/src/components/dashboard/ResumeActionButtons.tsx`
3. `/src/components/dashboard/ResumeActionCenter.tsx`
4. `/src/components/resume/ResumeSnapshotCard.tsx`

## Benefits

✅ **Single source of truth** - All messages in one place  
✅ **Consistent messaging** - Same message across all features  
✅ **Easy updates** - Change once, applies everywhere  
✅ **Better visibility** - Improved tooltip positioning and z-index  
✅ **Type-safe** - TypeScript ensures valid message keys  
✅ **Reusable** - Simple wrapper component for any feature  
✅ **Flexible** - Support for custom messages and positioning

## Testing

To test different tier scenarios, use the dev mode commands:

```bash
npm run dev                        # Default dev mode
npm run dev:basic                  # Test as Basic user
npm run dev:premium                # Test as Premium user
npm run dev:enterprise:recruiter   # Test as Enterprise recruiter
npm run dev:enterprise:jobseeker   # Test as Enterprise jobseeker
```

## Future Enhancements

Potential improvements to consider:

- Add upgrade CTA buttons to tooltips
- Track restriction impressions in analytics
- A/B test different messaging
- Add visual indicators (lock icons, badges)
- Implement feature discovery tours
