# Tiered Resume Search System - Implementation Summary

## Overview

Implemented a subscription-based resume search system with two tiers: **Basic** and **Premium**, each with different search capabilities and limitations.

---

## System Architecture

### 1. **User Profile Model** (`/api/user/profile`)

Added subscription tier support to user profiles:

```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isRecruiter: boolean;
  companyName?: string;
  subscriptionTier: "basic" | "premium"; // NEW
  createdAt?: string;
  updatedAt: string;
}
```

**Features:**

- GET: Fetch user profile
- POST: Create new user profile with subscription tier (defaults to "basic")
- PUT: Update profile including subscription tier

---

### 2. **Tiered Search API** (`/api/recruiter/search-resumes`)

#### BASIC Tier

- **Search by:** User ID (exact match only)
- **Max Results:** 1 resume per search
- **Data Returned:**

  - Resume ID
  - Title
  - User Name
  - Created At

- **Response:**
  - If found: Returns 1 resume
  - If not found: Returns "No published resume found for this candidate"

#### PREMIUM Tier

- **Search by:** Skills (multi-select) and/or Location
- **Max Results:** 50 resumes per search
- **Data Returned:**

  - Resume ID
  - Title
  - User Name
  - Skills (up to 5, shown as tags)
  - Location
  - Created At

- **Matching Logic:**
  - Skills: Partial match (case-insensitive)
  - Location: Partial match (case-insensitive)
  - Either skill OR location match = include result
  - Duplicate users: Only first resume shown per user

---

### 3. **UI Components**

#### RecruiterSearchBox (Main Component)

- Handles state management
- Manages search requests
- Displays results

#### RecruiterSearchForm (Sub-component)

- Toggle between Basic/Premium modes
- Mode-specific form rendering
- Input validation

#### RecruiterSearchResults (Sub-component)

- Results display grid
- Error/notification handling
- Empty states
- Resume cards with skills/location

---

## User Flow

### Basic Search (Basic Tier)

```
User enters candidate ID → API checks subscription → Returns max 1 resume
                          ↓
                    Not found → Show notification
```

### Premium Search (Premium Tier)

```
User selects skills and/or location → API checks subscription →
Returns all matching resumes (max 50) with skills and location displayed
```

---

## Files Created/Modified

### New Files

- `/src/app/api/recruiter/search-resumes/route.ts` - Main search API
- `/src/components/dashboard/RecruiterSearchForm.tsx` - Search form component
- `/src/components/dashboard/RecruiterSearchResults.tsx` - Results display component

### Modified Files

- `/src/app/api/user/profile/route.ts` - Added subscription tier support
- `/src/components/dashboard/RecruiterSearchBox.tsx` - Refactored to use sub-components

---

## API Examples

### Basic Tier Search

```typescript
// Request
POST /api/recruiter/search-resumes
{
  "recruiterId": "user-123",
  "userId": "candidate-456"
}

// Response
{
  "results": [{
    "resumeId": "res-789",
    "title": "Senior Engineer",
    "userName": "John Doe",
    "userId": "candidate-456",
    "createdAt": "2025-11-16T10:00:00Z"
  }],
  "notification": null,
  "tier": "basic",
  "maxResults": 1,
  "count": 1
}
```

### Premium Tier Search

```typescript
// Request
POST /api/recruiter/search-resumes
{
  "recruiterId": "user-123",
  "skills": ["React", "TypeScript"],
  "location": "San Francisco"
}

// Response
{
  "results": [
    {
      "resumeId": "res-789",
      "title": "Frontend Engineer",
      "userName": "Jane Smith",
      "userId": "candidate-456",
      "skills": ["React", "TypeScript", "Node.js"],
      "location": "San Francisco, CA",
      "createdAt": "2025-11-16T10:00:00Z"
    },
    // ... more results (max 50)
  ],
  "tier": "premium",
  "count": 15,
  "totalSearched": 15
}
```

---

## Key Features

✅ Subscription-based access control  
✅ Clean, intuitive UI with mode toggle  
✅ Skill and location tags in results  
✅ Error handling and notifications  
✅ Duplicate user prevention (one resume per user)  
✅ Results pagination support (max 50 for premium)  
✅ Responsive design with smooth transitions

---

## Next Steps (Optional Enhancements)

- [ ] Add payment integration for premium tier upgrade
- [ ] Implement saved searches
- [ ] Add advanced filters (experience level, salary range, etc.)
- [ ] Resume bookmarking for premium users
- [ ] Search history tracking
- [ ] Bulk export for premium users
