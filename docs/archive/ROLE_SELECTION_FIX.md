# Role Selection Issue - Fix Summary

## Problem Identified

The user account `anilalapati.66+dev01@gmail.com` had conflicting role data:

- **role**: "jobseeker"
- **isRecruiter**: true

This caused the app to show "Job Seeker" on refresh, then flicker to "Recruiter" after a second.

## Root Causes

1. **Two conflicting fields**: The system uses both `role` and `isRecruiter` to track user account type:

   - `role`: Controls dashboard layout (jobseeker vs recruiter interface)
   - `isRecruiter`: UI flag for settings component
   - These were getting out of sync

2. **API didn't update role properly**: The `/api/user/profile` PUT endpoint was intentionally preventing `isRecruiter` updates from the client for security reasons, but wasn't updating the `role` field at all.

3. **No role synchronization**: When the settings component toggled `isRecruiter`, the main `role` field wasn't updated, causing the dashboard to render incorrectly.

## Fixes Implemented

### 1. New API Endpoint: `/api/user/update-role`

**File**: `src/app/api/user/update-role/route.ts`

This endpoint properly handles role changes by:

- Updating both `role` AND `isRecruiter` atomically
- Validating the role is either "jobseeker" or "recruiter"
- Setting custom Auth claims for role-based security rules
- Updating the `roleUpdatedAt` timestamp for audit trails

### 2. Updated Settings Component

**File**: `src/components/dashboard/UserProfileSettings.tsx`

Changed the `handleRecruiterToggle` function to:

- Call the new `/api/user/update-role` endpoint instead of `/api/user/profile`
- Request the appropriate role ("recruiter" or "jobseeker")
- Trigger a page refresh after 1.5 seconds to ensure the dashboard re-renders with the correct interface

### 3. User Data Fix Script

**File**: `scripts/fix-user-role-inconsistency.js`

A utility script to fix existing users with conflicting role data:

```bash
node scripts/fix-user-role-inconsistency.js <uid> <role> [--project <projectId>]

# Example:
node scripts/fix-user-role-inconsistency.js Zrt1puxDGCfzsxttZxiDrDGJUpv2 recruiter --project switchcv-dev
```

## Current Status

✅ User `anilalapati.66+dev01@gmail.com` has been fixed:

- **Role**: recruiter
- **isRecruiter**: true
- Now displays consistently as "Recruiter"

## Testing Recommendations

1. **Toggle account type** in settings - should update smoothly without flickering
2. **Refresh the page** - should show consistent account type
3. **Check dashboard layout** - recruiter users should see recruiter interface, jobseekers should see jobseeker interface
4. **Verify role sync** - if you toggle the role, the dashboard should update after page refresh

## Files Modified

- `src/app/api/user/update-role/route.ts` (NEW)
- `src/components/dashboard/UserProfileSettings.tsx` (MODIFIED)
- `scripts/fix-user-role-inconsistency.js` (NEW)
- `scripts/check-user-role.js` (NEW - utility for checking roles via CLI)
