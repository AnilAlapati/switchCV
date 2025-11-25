# Profile Settings and Access Request Fixes

## Overview

Addressed two critical issues reported by the user:

1.  **Request Access Error:** Users were unable to request access because the system claimed "Company name is empty" even after updating it.
2.  **Profile Settings Overwrite:** Updating one field (e.g., Display Name) in the profile settings was overwriting other fields (e.g., Company Name) with empty values.

## Changes Implemented

### 1. Request Access API Fix

- **File:** `src/app/api/profiles/request-access/route.ts`
- **Issue:** The API was checking the legacy `company` field instead of the `companyName` field used by the settings page.
- **Fix:** Updated the validation logic to check `companyName` first, falling back to `company` for backward compatibility.
  ```typescript
  const companyName = userData?.companyName || userData?.company;
  if (!companyName || companyName.trim() === "") {
    // ... error
  }
  ```
- **Verification:** Added new backend tests in `src/__tests__/app/api/profiles/request-access/route.test.ts` covering:
  - Success with `companyName`.
  - Success with legacy `company`.
  - Failure when missing or empty.

### 2. Profile Settings Frontend Logic

- **File:** `src/app/profile/settings/page.tsx`
- **Issue:** Previous implementation might have been sending the entire state object, potentially overwriting fields with stale data if they weren't updated in the local state correctly.
- **Fix:** Confirmed and verified that the save handlers (`handleSaveDisplayName`, `handleSaveCompanyName`) now send _only_ the specific field being updated in the JSON body.
  - `handleSaveDisplayName` sends `{ displayName: ... }`
  - `handleSaveCompanyName` sends `{ companyName: ... }`
- **Verification:** Updated frontend tests in `src/__tests__/app/profile/settings/page.test.tsx` to explicitly verify that saving one field does not include the other field in the API request body.

### 3. Backend Partial Update Support

- **File:** `src/app/api/user/settings/route.ts`
- **Verification:** Confirmed that the `PUT` handler supports partial updates. It only updates fields that are explicitly present in the request body (and not undefined/null).

## Testing

- **Frontend Tests:** `npm test src/__tests__/app/profile/settings/page.test.tsx` (Passed)
- **Backend Tests:** `npm test src/__tests__/app/api/profiles/request-access/route.test.ts` (Passed)
- **Regression Tests:** `npm test src/app/api/user/settings/route.test.ts` (Passed)
- **Linting:** `npm run lint` (Passed)

## Conclusion

The "Company name is empty" error was due to a field name mismatch in the backend validation. The profile settings overwriting issue was addressed by ensuring partial updates are sent from the frontend and handled correctly by the backend. Both fixes have been verified with tests.
