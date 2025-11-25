# ✏️ Resume Editing System

## Overview

- Added a dedicated resume editing workflow so job seekers can update existing resumes without regenerating from scratch.
- Introduced a client-side wizard that reuses the onboarding steps, pre-fills data, and saves incremental changes.
- Expanded the resume API to support authenticated updates with ownership validation and metadata sync.
- Updated the dashboard to surface a direct "Edit" action alongside existing view and delete controls.

## Key Components

- `src/app/resumes/[id]/edit/page.tsx`: Fetches resume data, manages save lifecycle, and renders the editor wizard.
- `src/components/resume/ResumeEditWizard.tsx`: Presentation layer for the multi-step editor (progress, navigation, dirty tracking).
- `src/app/api/resumes/[id]/route.ts`: New `PUT` handler sanitizes payloads, enforces ownership, and updates derivative collections.
- `src/components/dashboard/ResumeStatusCard.tsx`: Adds the new "Edit" button with disabled fallback when the ID is unresolved.

## API Contract

- **Endpoint**: `PUT /api/resumes/{id}`
- **Headers**: `Authorization: Bearer <Firebase ID token>`
- **Body**:
  ```json
  {
    "resume": {
      "title": "Updated Title",
      "summary": "New summary",
      "skills": [],
      "experience": []
    }
  }
  ```
- **Behaviour**:
  - Rejects missing/invalid payloads (`400`).
  - Requires authentication (`401`) and resume ownership (`403`).
  - Merges updates while preserving protected fields (`userId`, `numericId`, visibility flags).
  - Synchronises the primary record, user sub-collection snapshot, and `allResumes` index.

## Editing UX Highlights

- Multi-step form mirrors onboarding (basic info, experience, education, skills, projects, contact, review).
- Dirty-state tracking disables the save button until changes occur and prevents duplicate submissions.
- Success/Error banners give immediate feedback; last saved metadata remains visible in the header.
- Loading, auth, and error states redirect or message the user appropriately.

## Testing

- Added `route.test.ts` validating the new `PUT` handler for auth, ownership, payload sanitation, and success paths.
- Extended `ResumeStatusCard` tests to cover the new edit control and disabled state.
- Existing Jest suite continues to cover onboarding steps reused in the wizard.

## Next Steps

- Add optimistic UI feedback (auto-dismiss success banner after a timeout).
- Extend editor to preview live resume template side-by-side.
- Allow section-level undo or version history using existing analytics storage.
