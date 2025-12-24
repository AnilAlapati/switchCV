# Analytics Feature - Implementation Guide

## Overview

The Analytics feature provides comprehensive insights into platform performance, user engagement, and resume metrics for SwitchCV. It consists of two main components:

1. **System-wide Analytics** (`/analytics`) - Platform metrics for admins and recruiters
2. **Resume Analytics** (`/analytics/[resumeId]`) - Detailed metrics for individual resumes

## Architecture

### Frontend Routes

- **`/analytics`** - System dashboard (admin/recruiter only)
- **`/analytics/[resumeId]`** - Individual resume analytics (owner access)

### Backend APIs

- **`GET /api/analytics/system`** - System-wide metrics (admin/recruiter only)
- **`GET /api/profiles/analytics?resumeId={id}`** - Resume-specific metrics (existing)
- **`GET /api/analytics/dashboard`** - Dashboard analytics (existing)

### Components

```
src/
├── app/
│   ├── analytics/
│   │   ├── page.tsx                    # System analytics dashboard
│   │   └── [resumeId]/
│   │       └── page.tsx                # Resume-specific analytics
│   └── api/
│       └── analytics/
│           ├── system/
│           │   ├── route.ts            # System metrics API
│           │   └── route.test.ts       # API tests
│           └── dashboard/
│               └── route.ts            # Dashboard API (existing)
└── components/
    ├── analytics/
    │   ├── AnalyticsMetrics.tsx        # Key metrics display
    │   ├── EngagementDetails.tsx       # Engagement statistics
    │   ├── RequestStatistics.tsx       # Contact request stats
    │   └── TopReferrers.tsx            # Traffic sources
    └── dashboard/
        ├── ResumeSnapshotCard.tsx      # Updated with analytics link
        └── UserProfileMenu.tsx         # Added analytics menu item
```

## Access Control

### Role-Based Permissions

| Feature                     | Admin | Recruiter | Job Seeker |
| --------------------------- | ----- | --------- | ---------- |
| System Analytics            | ✅    | ✅        | ❌         |
| Own Resume Analytics        | ✅    | ✅        | ✅         |
| Other User Resume Analytics | ✅    | ❌        | ❌         |

### Implementation

```typescript
// System analytics access check
const userRole = userData.role;
if (userRole !== "admin" && userRole !== "recruiter") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

## Data Model

### System Analytics

```typescript
interface SystemAnalytics {
  totalUsers: number;
  totalResumes: number;
  activeRecruiters: number;
  totalViews: number;
  totalContactRequests: number;
  averageAttractiveness: number;
  topIndustries: Array<{ name: string; count: number }>;
  recentActivity: Array<{
    type: string;
    timestamp: Date;
    description: string;
  }>;
  subscriptionDistribution: {
    basic: number;
    premium: number;
    enterprise: number;
  };
}
```

### Resume Analytics

```typescript
interface Analytics {
  views: {
    count: number;
    uniqueViewers: number;
    trend: string;
  };
  engagement: {
    averageTimeOnPage: number;
    bounceRate: number;
    interactionRate: number;
  };
  contactRequests: {
    count: number;
    approvalRate: number;
    pendingCount: number;
  };
  topReferrers: Array<{ source: string; count: number }>;
  demographics: {
    topIndustries: string[];
    topLocations: string[];
  };
  searchKeywords: string[];
  attractivenessScore: number;
}
```

## Firestore Collections

### Analytics Collection

```
analytics/{resumeId}/
├── viewCount: number
├── uniqueViewCount: number
├── downloadCount: number
├── shareCount: number
├── attractivenessScore: number
├── lastViewedAt: Timestamp
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

### View Events Subcollection

```
analytics/{resumeId}/viewEvents/{eventId}/
├── viewerId: string
├── viewedAt: Timestamp
├── duration: number
├── sourceType: string
└── metadata: object
```

## Navigation

### Dashboard Menu

The "View Analytics →" link in the Resume Snapshot Card now points to:

```tsx
<Link href={`/analytics/${resumeId}`}>View Analytics →</Link>
```

### User Profile Menu

Analytics menu item (admin/recruiter only):

```tsx
{
  hasAnalyticsAccess && (
    <Link href="/analytics">
      <span>View Analytics</span>
    </Link>
  );
}
```

## Dev Mode Testing

Use dev mode overrides to test analytics with different roles:

```bash
# Test as admin
npm run dev:enterprise:recruiter

# Test as basic jobseeker (no system analytics access)
npm run dev:basic
```

## API Usage Examples

### Fetch System Analytics

```typescript
const response = await fetch("/api/analytics/system");
const data: SystemAnalytics = await response.json();
```

### Fetch Resume Analytics

```typescript
const response = await fetch(`/api/profiles/analytics?resumeId=${resumeId}`);
const data = await response.json();
```

## Error Handling

### Common Errors

1. **401 Unauthorized** - User not authenticated
2. **403 Forbidden** - User lacks required role
3. **404 Not Found** - Resume or user not found
4. **500 Internal Server Error** - Database or processing error

### Error Response Format

```typescript
{
  error: string; // Human-readable error message
}
```

## Performance Considerations

1. **Aggregations** - Cached for 5 minutes to reduce Firestore reads
2. **Pagination** - Recent activity limited to 10 items
3. **Parallel Queries** - Use `Promise.all()` for concurrent fetches
4. **Indexes** - Required Firestore indexes:
   - `resumes` ordered by `createdAt`
   - `contactRequests` ordered by `createdAt`
   - `analytics/viewEvents` ordered by `viewedAt`

## Testing

### Unit Tests

```bash
npm test -- src/app/api/analytics/system/route.test.ts
```

### E2E Tests

```bash
npm run e2e -- --grep "analytics"
```

### Manual Testing

1. Navigate to `/dashboard`
2. Click user menu → "View Analytics" (admin/recruiter only)
3. View system-wide metrics
4. Click "View Analytics →" on resume card
5. View resume-specific analytics

## Future Enhancements

- [ ] Export analytics data (CSV/PDF)
- [ ] Custom date range filtering
- [ ] Real-time analytics with WebSockets
- [ ] Predictive analytics (ML-based trends)
- [ ] Email digest reports
- [ ] Comparison charts (month-over-month)
- [ ] Heatmap visualizations for resume sections
- [ ] Integration with PostHog for advanced tracking

## Security Notes

1. All analytics routes use `getAuthenticatedUserId()` for auth
2. Role checks enforce admin/recruiter-only access for system metrics
3. Resume analytics verify ownership before returning data
4. No PII exposed in analytics (aggregated data only)
5. Rate limiting applied to prevent abuse

## Related Documentation

- [API Documentation](../docs/API.md)
- [Tier Restrictions](../docs/TIER_RESTRICTIONS.md)
- [Security](../docs/SECURITY.md)
- [Schema](../docs/SCHEMA.md)
