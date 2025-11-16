# Dashboard Enhancements: User Profile Settings & Recruiter Search

## Overview

We've successfully added comprehensive user profile settings and recruiter resume search functionality to the SwitchCV dashboard (`http://localhost:3000/dashboard`). These features enable users to:

1. **Manage Profile Settings** - Toggle recruiter status and manage recruiter profile information
2. **Search Resumes** - Recruiters can search for candidate resumes by number, skills, or candidate details
3. **Request Access** - Recruiters can request access to specific candidate information

---

## Features Added

### 1. User Profile Settings Card

**Location:** Dashboard top section, always visible

**Features:**

- Display current user email and account type
- Toggle between "Job Seeker" and "Recruiter" accounts
- Company name input field (appears when recruiter mode is enabled)
- Real-time settings updates with success/error feedback
- Responsive design with gradient styling

**UI Components:**

- Account type indicator (color-coded: cyan for Job Seeker, amber for Recruiter)
- Toggle switch for recruiter activation
- Conditional company name input with save button
- Toast notifications for user feedback

**Implementation:**

```
src/components/dashboard/UserProfileSettings.tsx
```

---

### 2. Recruiter Search Box

**Location:** Dashboard, appears only for recruiter users

**Features:**

- Search resumes by:
  - Resume number (e.g., #001, #042)
  - Resume title
  - Candidate name
  - Skills
- Display search results with:
  - Resume title and candidate information
  - Skills preview (top 5 with "more" indicator)
  - Resume summary excerpt
  - Creation date
  - Action buttons: "View Resume" and "Request Access"

**Search Results Display:**

- Shows total matches found
- Resume card with enhanced styling
- Quick links to view or request access
- Empty state messages for no results

**Implementation:**

```
src/components/dashboard/RecruiterSearchBox.tsx
```

---

## API Endpoints

### 1. User Settings API

**Endpoint:** `/api/user/settings`

#### GET - Retrieve User Settings

```
GET /api/user/settings?userId={userId}

Response:
{
  "isRecruiter": boolean,
  "displayName": string,
  "companyName": string,
  "updatedAt": ISO8601 timestamp
}
```

#### PUT - Update User Settings

```
PUT /api/user/settings
Body: {
  "userId": string,
  "isRecruiter": boolean,
  "companyName": string
}

Response:
{
  "success": true,
  "message": "Settings updated successfully"
}
```

**Implementation:**

```
src/app/api/user/settings/route.ts
```

---

### 2. Recruiter Search API

**Endpoint:** `/api/recruiter/search`

#### GET - Search Resumes

```
GET /api/recruiter/search?q={searchQuery}

Query Parameters:
- q (required): Search term (resume number, title, name, or skill)

Response:
{
  "results": [
    {
      "resumeId": string,
      "title": string,
      "userName": string,
      "userEmail": string,
      "slug": string,
      "createdAt": ISO8601 timestamp,
      "skills": string[],
      "summary": string
    }
  ],
  "count": number,
  "query": string
}
```

**Search Logic:**

1. Searches published resumes by:
   - Resume ID (first 6 characters)
   - Resume title
   - Skills included
2. Falls back to searching users by name/email if no resumes found
3. Returns up to 20 most relevant results
4. Removes duplicate results automatically

**Implementation:**

```
src/app/api/recruiter/search/route.ts
```

---

### 3. Recruiter Request Access API

**Endpoint:** `/api/recruiter/request-access`

#### POST - Send Access Request

```
POST /api/recruiter/request-access
Body: {
  "resumeId": string,
  "requestedFields": string[] (optional, default: ["email", "phone"])
}

Response:
{
  "success": true,
  "requestId": string,
  "message": "Access request sent successfully..."
}
```

**Functionality:**

- Creates new access request for recruiter
- Checks for existing pending requests (prevents duplicates)
- Notifies candidate of request
- Increments request count on user profile
- Returns unique request ID

**Error Handling:**

- 404: Resume or user not found
- 409: Request already exists
- 500: Server error

**Implementation:**

```
src/app/api/recruiter/request-access/route.ts
```

---

## Data Flow

### User Profile Settings

```
Dashboard (page.tsx)
    ↓
UserProfileSettings Component
    ↓
GET /api/user/settings (fetch current settings)
    ↓
User toggles recruiter switch
    ↓
PUT /api/user/settings (save changes)
    ↓
Update Firestore users collection
    ↓
Conditional render RecruiterSearchBox
```

### Recruiter Resume Search

```
RecruiterSearchBox Component
    ↓
User enters search query
    ↓
GET /api/recruiter/search (search resumes)
    ↓
Query Firestore:
  1. Search resumes collection
  2. Filter by title, ID, skills
  3. Fallback to user search
    ↓
Return results with user info
    ↓
Display search results
    ↓
User clicks "Request Access"
    ↓
POST /api/recruiter/request-access
    ↓
Create recruiterRequests document
    ↓
Update user request count
    ↓
Send notification to candidate
```

---

## Database Schema Updates

### Users Collection

**New Fields:**

```typescript
{
  isRecruiter: boolean,              // Recruiter status
  companyName: string,               // Company name (recruiter only)
  settingsUpdatedAt: timestamp,      // Last settings update
  requestCount: number               // Number of pending requests
}
```

### Resumes Collection

**Existing fields used:**

```typescript
{
  published: boolean,                // Only search published
  title: string,                     // Search by title
  skills: Skill[],                   // Search by skills
  summary: string,                   // Display summary
  generatedText: { polished: string }// Fallback for summary
}
```

### New Collection: recruiterRequests

```typescript
{
  resumeId: string,                  // Target resume
  userId: string,                    // Candidate user ID
  resumeTitle: string,               // Resume title (snapshot)
  userEmail: string,                 // Candidate email (snapshot)
  requestedFields: string[],         // Requested PII fields
  status: "pending" | "approved" | "denied",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## How to Use

### For Job Seekers

1. Go to Dashboard (`/dashboard`)
2. See "Profile Settings" card at the top
3. Current account type is displayed
4. No additional action needed unless switching to recruiter

### For Recruiters

1. Go to Dashboard (`/dashboard`)
2. In "Profile Settings" card:
   - Toggle "Recruiter Account" ON
   - Enter your company name
   - Click "Save"
3. "Recruiter Resume Search" section appears
4. Search for candidates:
   - Enter resume number (e.g., #001)
   - Or search by candidate name
   - Or search by skills (e.g., "React")
5. View results and:
   - Click "View Resume" to see full profile
   - Click "Request Access" to request contact details
6. Candidate receives notification and can approve/deny

---

## Testing Checklist

- [x] Build successfully completes
- [x] No TypeScript compilation errors
- [x] API endpoints created and accessible
- [x] User settings toggle works
- [x] Company name input shows/hides correctly
- [x] Recruiter search component renders only for recruiters
- [x] Search functionality returns results
- [x] Access request creation works
- [x] Firestore collections configured properly

---

## Technical Details

### Technologies Used

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Firestore
- **Auth:** Firebase Auth

### Component Structure

```
Dashboard (page.tsx)
├── DashboardHeader
├── UserProfileSettings
│   ├── User info display
│   ├── Recruiter toggle
│   └── Company name input
├── Dashboard stats cards
└── RecruiterSearchBox (conditional)
    ├── Search input
    ├── Search results
    └── Access request buttons
```

### State Management

- React hooks (useState, useEffect)
- Local component state for form inputs
- Firestore as single source of truth
- Real-time updates via fetch API

---

## Future Enhancements

1. **Advanced Search Filters**

   - Filter by experience level
   - Filter by location
   - Filter by salary expectations
   - Date range filters

2. **Recruiter Dashboard**

   - View request history
   - Track approved/denied requests
   - Analytics on search activity
   - Saved candidates list

3. **Notifications**

   - Email notifications for access requests
   - In-app notification system
   - Request status updates

4. **Access Token Management**

   - Auto-expiring PII access
   - Revoke access functionality
   - Access audit logs

5. **Search Enhancements**
   - Full-text search indexing
   - Search analytics/trending
   - Save search templates
   - Scheduled search alerts

---

## Files Created/Modified

### New Files

```
src/components/dashboard/UserProfileSettings.tsx    (135 lines)
src/components/dashboard/RecruiterSearchBox.tsx     (260 lines)
src/app/api/user/settings/route.ts                  (60 lines)
src/app/api/recruiter/search/route.ts               (140 lines)
src/app/api/recruiter/request-access/route.ts      (95 lines)
```

### Modified Files

```
src/app/dashboard/page.tsx                          (added imports and JSX)
```

---

## Support

For issues or questions:

1. Check the API response errors
2. Review browser console for client-side errors
3. Check server logs for API errors
4. Verify Firestore permissions and data structure
5. Ensure user is authenticated before accessing protected endpoints

---

Generated: November 16, 2025
Version: 1.0
