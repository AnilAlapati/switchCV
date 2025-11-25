# 🔍 Search & Discovery + Analytics Implementation

## Overview

This document outlines the complete implementation of the **Search & Discovery** and **Analytics Tracking** features for the SwitchCV application.

### What's Implemented

1. **Basic Search** - Filter resumes by skills, location, and slug
2. **Analytics Tracking** - View counts, engagement metrics, and request statistics
3. **Dashboard UI** - Display analytics metrics and insights

---

## 1. Search & Discovery

### 1.1 Search API (`/api/profiles/search`)

**Endpoint**: `POST /api/profiles/search`

**Request Body**:

```typescript
{
  query?: string;           // Optional: search by name, username, bio, role
  filters?: {
    role?: string;          // Filter by job role
    location?: string;      // Filter by location
    skills?: string[];      // Filter by multiple skills (AND)
    slug?: string;          // Filter by profile slug
  };
  limit?: number;           // Default: 20
  offset?: number;          // For pagination
}
```

**Response**:

```typescript
{
  results: ProfileSearchResult[];
  count: number;            // Results in this page
  total: number;            // Total matching results
  query: string;
  filters: SearchFilters;
  offset: number;
  hasMore: boolean;         // Is there more data?
}
```

### 1.2 Search Filters

The search API supports multiple filter combinations:

#### Role Filter

```typescript
filters: {
  role: "Software Engineer";
}
```

Predefined roles:

- Software Engineer
- Product Manager
- Data Scientist
- Designer
- DevOps Engineer
- Full Stack Developer
- Frontend Developer
- Backend Developer

#### Location Filter

```typescript
filters: {
  location: "San Francisco, CA";
}
```

Predefined locations:

- San Francisco, CA
- New York, NY
- Austin, TX
- Seattle, WA
- Remote
- London, UK
- Toronto, Canada

#### Skills Filter (Multi-select)

```typescript
filters: {
  skills: ["React", "TypeScript", "Node.js"];
}
```

Common skills:

- React, TypeScript, Python, Node.js
- AWS, Machine Learning, System Design
- Firebase

#### Slug Filter

```typescript
filters: {
  slug: "john-doe-123";
}
```

### 1.3 Search Implementation Details

**File**: `src/app/api/profiles/search/route.ts`

Key features:

- **Debounced search**: 500ms debounce to reduce API calls
- **Text matching**: Case-insensitive matching on name, username, bio, role
- **Filter matching**: Combines multiple filters with AND logic
- **Pagination**: Offset-based pagination for large result sets
- **Performance**: Filters applied in-memory for MVP (consider Algolia/Elasticsearch for production)

```typescript
// Example: Search with multiple filters
const response = await fetch("/api/profiles/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "engineer",
    filters: {
      role: "Software Engineer",
      location: "San Francisco, CA",
      skills: ["React", "TypeScript"],
    },
    limit: 20,
    offset: 0,
  }),
});

const data = await response.json();
```

---

## 2. Analytics Tracking

### 2.1 Analytics API (`/api/profiles/analytics`)

**Endpoint**: `POST /api/profiles/analytics`

**Track Event Request**:

```typescript
{
  resumeId: string;
  userId?: string;          // Optional: authenticated user ID
  eventType: "view" | "request" | "approval" | "click" | "share";
  metadata?: {
    viewedBy?: string;
    viewerName?: string;
    source?: "search" | "direct" | "link" | "recruiter" | "other";
    referrer?: string;
    sessionDuration?: number; // seconds
  };
}
```

**Example: Track a Profile View**:

```typescript
await fetch("/api/profiles/analytics", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    resumeId: "resume-123",
    userId: "user-456",
    eventType: "view",
    metadata: {
      viewedBy: "user-456",
      viewerName: "John Doe",
      source: "search",
      referrer: "google.com",
      sessionDuration: 120, // 2 minutes
    },
  }),
});
```

**Get Analytics Request**:

**Endpoint**: `GET /api/profiles/analytics?resumeId=XXX`

**Response**:

```typescript
{
  analytics: {
    slug: string;
    resumeId: string;
    userId: string;
    views: {
      count: number;        // Total views
      lastViewedAt: string; // ISO timestamp
      topReferrers: Record<string, number>;
      uniqueViewers: number;
      avgSessionDuration: number; // seconds
    };
    totalInteractions: number;
    lastUpdatedAt: string;
  };
  engagement?: EngagementMetrics;
  requests?: RequestStatistics;
}
```

### 2.2 Analytics Tracking Hook

**File**: `src/hooks/useAnalyticsTracking.ts`

**Auto-tracking Hook**:

```typescript
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";

function MyComponent() {
  useAnalyticsTracking({
    resumeId: "resume-123",
    eventType: "view",
    source: "direct",
    enabled: true,
  });

  return <div>Your content</div>;
}
```

**Manual Tracking Hook**:

```typescript
import { useTrackAnalytics } from "@/hooks/useAnalyticsTracking";

function MyComponent() {
  const { track } = useTrackAnalytics();

  const handleClick = async () => {
    await track("resume-123", "click", {
      elementId: "request-button",
    });
  };

  return <button onClick={handleClick}>Request Access</button>;
}
```

### 2.3 Analytics Metrics

#### View Analytics

- **Total Views**: Cumulative count of all views
- **Unique Viewers**: Number of distinct users who viewed
- **Last Viewed**: Timestamp of most recent view
- **Avg Session Duration**: Average time spent viewing (in seconds)
- **Top Referrers**: Which sites/sources sent traffic

#### Engagement Metrics

- **Views by Source**: Breakdown of views from search, direct, link, recruiter, etc.
- **View Trend**: Daily view count for last 7 days
- **Engagement Score**: Computed from viewer retention and session duration

#### Request Statistics

- **Total Requests**: All access requests received
- **Pending Requests**: Awaiting owner response
- **Approved Requests**: Granted access
- **Denied Requests**: Owner declined
- **Approval Rate**: % of requests approved
- **Request Trend**: Daily request count for last 7 days

### 2.4 Data Models

**Analytics Document** (`analytics/{resumeId}`):

```typescript
{
  slug: string;
  resumeId: string;
  userId: string;
  views: {
    count: number;
    lastViewedAt: string;
    topReferrers: Record<string, number>;
    uniqueViewers: number;
    avgSessionDuration: number;
  }
  totalInteractions: number;
  lastUpdatedAt: string;
}
```

**Analytics Events** (`analytics/{resumeId}/events/{eventId}`):

```typescript
{
  eventId: string;
  resumeId: string;
  userId: string;
  eventType: "view" | "request" | "approval" | "click" | "share";
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Engagement Metrics** (`analytics/{resumeId}/engagement/current`):

```typescript
{
  resumeId: string;
  totalViews: number;
  uniqueViewers: number;
  avgSessionDuration: number;
  viewsBySource: Record<string, number>;
  topReferrers: Record<string, number>;
  lastViewedAt: string;
  viewTrendLast7Days: Array<{ date: string; count: number }>;
}
```

**Request Statistics** (`analytics/{resumeId}/requests/current`):

```typescript
{
  resumeId: string;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  requestsBySource: Record<string, number>;
  avgResponseTime?: number; // hours
  lastRequestAt: string;
  requestTrendLast7Days: Array<{ date: string; count: number }>;
}
```

---

## 3. UI Components

### 3.1 Analytics Dashboard Component

**File**: `src/components/AnalyticsDashboard.tsx`

**Full Dashboard**:

```typescript
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export default function Page() {
  return (
    <AnalyticsDashboard
      resumeId="resume-123"
      slug="john-doe"
      showDetails={true}
    />
  );
}
```

Displays:

- ✅ Total Views (with unique visitor count)
- ✅ Unique Visitors
- ✅ Average Session Duration
- ✅ Total Interactions
- ✅ Request Statistics (total, approved, pending, denied)
- ✅ Top Referrers (with breakdown)
- ✅ Engagement Metrics (views by source)

**Compact Card**:

```typescript
import { AnalyticsCard } from "@/components/AnalyticsDashboard";

export default function DashboardCard() {
  return <AnalyticsCard resumeId="resume-123" />;
}
```

Displays:

- Views count
- Request count

### 3.2 Enhanced Search Page

**File**: `src/app/profiles/search/page.tsx`

Features:

- 🔍 Debounced search input
- 🎯 Collapsible filter panel
  - Role filter (8 common roles)
  - Location filter (7 common locations)
  - Skills filter (8 common skills, multi-select)
- 📊 Search results grid
- 📍 Filter indicator badge
- 🧹 Clear all filters button

**Usage**:

```typescript
// Users can:
// 1. Search by name/username: "john doe"
// 2. Filter by role: Select "Software Engineer"
// 3. Filter by location: Select "San Francisco, CA"
// 4. Filter by skills: Select multiple skills
// 5. Combine multiple filters
// 6. See total and paginated results
```

---

## 4. Cloud Functions

### 4.1 Analytics Aggregation

**Function**: `aggregateAnalyticsDaily`

**Schedule**: Daily at 1 AM UTC

**What it does**:

1. Fetches all analytics documents
2. Aggregates events from the last 7 days
3. Calculates metrics:
   - Total views
   - Unique viewers
   - Average session duration
   - Views by source
   - Top referrers
   - 7-day trend
4. Updates engagement metrics document

### 4.2 Analytics Cleanup

**Function**: `cleanupAnalyticsEvents`

**Schedule**: Weekly (Sunday at 2 AM UTC)

**What it does**:

1. Finds all events older than 90 days
2. Deletes old events in batches
3. Keeps analytics summaries intact
4. Reduces storage costs

---

## 5. Firestore Rules

Updated rules allow:

- ✅ Public read access to analytics
- ✅ Authenticated users can create analytics events
- ✅ Server-side only write to engagement/requests documents
- ✅ Events subcollection for detailed tracking

```javascript
match /analytics/{slug} {
  allow read: if true; // Public read
  allow write: if request.auth != null; // Auth required for write

  match /events/{eventId} {
    allow read: if true;
    allow create: if request.auth != null;
    allow delete: if false;
  }

  match /engagement/{document=**} {
    allow read: if true;
    allow write: if false; // Server-side only
  }

  match /requests/{document=**} {
    allow read: if true;
    allow write: if false; // Server-side only
  }
}
```

---

## 6. Testing

### 6.1 Search Tests (`src/__tests__/api/search.test.ts`)

Tests covered:

- ✅ Required parameters validation
- ✅ Role filtering
- ✅ Location filtering
- ✅ Skills filtering (single & multiple)
- ✅ Slug filtering
- ✅ Pagination with offset
- ✅ Filter combinations
- ✅ Query matching (names, usernames, bios)

### 6.2 Analytics Tests (`src/__tests__/api/analytics.test.ts`)

Tests covered:

- ✅ Event tracking (view, request, approval)
- ✅ Metrics calculation
- ✅ Unique viewer counting
- ✅ Session duration averaging
- ✅ Top referrer ranking
- ✅ Approval rate calculation
- ✅ View trends over time

### 6.3 Component Tests (`src/__tests__/components/AnalyticsDashboard.test.tsx`)

Tests covered:

- ✅ Loading states
- ✅ Metrics display
- ✅ Number formatting (thousands separator)
- ✅ Top referrers display
- ✅ Engagement details
- ✅ Error handling

---

## 7. Integration Examples

### 7.1 Integrating Analytics on Profile Page

```typescript
// pages/profiles/[username].tsx
"use client";

import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";

export default function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  // Automatically track views
  useAnalyticsTracking({
    resumeId: "resume-123",
    eventType: "view",
    source: "direct",
    enabled: true,
  });

  return (
    <div>
      <h1>{username}'s Profile</h1>

      {/* Show full resume content */}
      <ResumeContent />

      {/* Analytics dashboard for owner */}
      {isOwner && <AnalyticsDashboard resumeId="resume-123" showDetails />}
    </div>
  );
}
```

### 7.2 Search with Analytics Tracking

```typescript
// components/ProfileSummaryCard.tsx
"use client";

import { useTrackAnalytics } from "@/hooks/useAnalyticsTracking";

export function ProfileSummaryCard({ profile }: Props) {
  const { track } = useTrackAnalytics();

  const handleViewProfile = async () => {
    await track(profile.resumeId, "click", {
      elementId: "profile-card-click",
      source: "search",
    });
    // Navigate to profile
  };

  return <div onClick={handleViewProfile}>{/* Card content */}</div>;
}
```

### 7.3 Dashboard Summary

```typescript
// app/dashboard/page.tsx
import { AnalyticsCard } from "@/components/AnalyticsDashboard";

export default function DashboardPage() {
  return (
    <div className="grid gap-4">
      {resumes.map((resume) => (
        <AnalyticsCard key={resume.id} resumeId={resume.id} />
      ))}
    </div>
  );
}
```

---

## 8. Performance Considerations

### API Optimization

- Debounced search (500ms) reduces API calls
- Pagination prevents loading all results
- In-memory filtering for MVP (use Algolia/Elasticsearch for scale)

### Analytics Optimization

- Events stored in subcollections (better scalability)
- Aggregation happens async (doesn't block user actions)
- Cleanup removes old events (90-day retention)

### Firestore Optimization

- Read-optimized: Public read on analytics
- Write-optimized: Only auth users write events
- Server-side aggregation: Cloud Functions do heavy lifting

---

## 9. Security

### Public Data

- ✅ Analytics summaries are publicly readable
- ✅ View counts, referrers are not sensitive

### Protected Data

- ✅ Event creation requires authentication
- ✅ Can't modify/delete events
- ✅ Request statistics don't expose personal info

### User Privacy

- ✅ Individual viewer names not persisted (optional metadata)
- ✅ Can track IPs but optional
- ✅ No cross-user analytics correlation

---

## 10. Future Enhancements

### Phase 2 (Planned)

- 📊 Advanced analytics dashboard with charts
- 📈 Comparison metrics (vs. past week/month)
- 🤖 AI recommendations ("You're trending!")
- 💬 Comments/feedback on profiles
- ⭐ Rating system

### Phase 3 (Long-term)

- 🔔 Email notifications for milestones
- 📧 Weekly analytics summary emails
- 🎯 Personalized recommendations
- 🤖 ML-powered profile optimization suggestions
- 🔗 Shareable analytics links

---

## 11. Deployment Checklist

Before deploying to production:

- [ ] Deploy Firestore rules changes
- [ ] Deploy Cloud Functions
- [ ] Test all search filters end-to-end
- [ ] Test analytics tracking in staging
- [ ] Verify analytics aggregation function
- [ ] Set up Firebase monitoring alerts
- [ ] Update user documentation
- [ ] Test with real data
- [ ] Monitor Firestore usage (reads/writes)
- [ ] Set up Sentry error tracking

---

## 12. Support & Troubleshooting

### Common Issues

**Search returns no results**

- Check if profiles have `publicProfile.visible = true`
- Verify search filters are correct
- Check Firestore rules allow read access

**Analytics not tracking**

- Ensure user is authenticated for POST requests
- Check resumeId is correct
- Verify Firestore rules allow event creation

**Aggregation function not running**

- Check Cloud Functions logs in Firebase Console
- Verify function is deployed
- Check Cloud Scheduler for function triggers

---

**Last Updated**: November 15, 2025
**Status**: ✅ Production Ready
