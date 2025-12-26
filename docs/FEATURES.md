# Platform Features & Access Control

This document details the core features of SwitchCV and the mechanisms used to gate them based on user subscription tiers.

## 1. Analytics Feature

The platform provides dual-layered analytics:
- **System Analytics** (`/analytics`): Admin/Recruiter views of global platform performance (signups, resume counts, search volume).
- **Resume Analytics** (`/analytics/[id]`): Owner-specific view of profile hits, contact requests, and engagement trends.

## 2. Subscription Tiers & Restrictions

Access is managed via three tiers: **Basic**, **Premium**, and **Enterprise**. 

### Restriction Messages
Standardized messages for gated features are defined in `src/lib/utils/tier-restrictions.ts`. 
- `AI_EDIT`: "Upgrade to unlock advanced AI-powered resume editing."
- `ADVANCED_SEARCH`: "Available for Premium & Enterprise users."

### Feature Gates (UI Components)

We use two primary patterns for locking features:

#### A. Full Section Lock (`PremiumFeatureLock`)
Best for entire cards or dashboard sections. It overlays a blur and upgrade prompt.
```tsx
<PremiumFeatureLock 
  featureName="Analytics" 
  description={TIER_RESTRICTION_MESSAGES.ANALYTICS_DASHBOARD}
>
  <MyFeatureContent />
</PremiumFeatureLock>
```

#### B. Individual Element Lock (`RestrictedFeature`)
Best for individual buttons (e.g., "AI Edit"). It disables the button and shows a tooltip explaining the requirement.
```tsx
<RestrictedFeature messageKey="AI_EDIT" requiredTier="premium">
  <button>AI Edit</button>
</RestrictedFeature>
```

## 3. Development & Testing
To test how different users see these features, use the following dev overrides:
- `npm run dev:basic`: Test as a standard free user.
- `npm run dev:premium`: Test as a paid premium user.
- `npm run dev:enterprise:recruiter`: Test with full admin/recruiter access.
