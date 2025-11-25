# Visual Guide: Dashboard Recruiter Features

## Dashboard Layout Overview

```
┌─────────────────────────────────────────────────────┐
│             SwitchCV Dashboard Header                │
│    Welcome back, [email] | Logout Button           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          Profile Settings Card (ALWAYS VISIBLE)     │
│  ┌────────────────────────────────────────────────┐ │
│  │ ⚙️  PROFILE SETTINGS                           │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Email: user@example.com                        │ │
│  │ Account Type: 🟦 Job Seeker (or 🟨 Recruiter) │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Recruiter Account                    [TOGGLE]  │ │
│  │ Enable to access recruiter features...         │ │
│  │                                                │ │
│  │ (If Recruiter ON:)                            │ │
│  │ Company Name: [________] [SAVE]                │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          Dashboard Stats (3 columns)                │
│  ┌──────────┬──────────┬──────────┐                 │
│  │ Resumes  │ Profile  │ Contact  │                 │
│  │ Status   │ Views    │ Requests │                 │
│  └──────────┴──────────┴──────────┘                 │
│  ┌──────────┬──────────┬──────────┐                 │
│  │ Resume   │ Last     │ Downloads│                 │
│  │ Quality  │ Updated  │          │                 │
│  └──────────┴──────────┴──────────┘                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│   RECRUITER SEARCH (ONLY IF RECRUITER = TRUE)      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔍 RECRUITER RESUME SEARCH                     │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Search Box                          [SEARCH]   │ │
│  │ 💡 Tip: Search by resume #, skills, or name   │ │
│  ├────────────────────────────────────────────────┤ │
│  │                                                │ │
│  │ ┌─────────────────────────────────────────┐   │ │
│  │ │ 📄 Resume Title                         │   │ │
│  │ │ 👤 Jane Doe (jane@example.com)         │   │ │
│  │ │ #123abc                                 │   │ │
│  │ │                                         │   │ │
│  │ │ Skills: React • JavaScript • TypeScript│   │ │
│  │ │ + 2 more                                │   │ │
│  │ │                                         │   │ │
│  │ │ [View Resume] [Request Access]         │   │ │
│  │ │                                         │   │ │
│  │ │ Posted: Nov 15, 2025                   │   │ │
│  │ └─────────────────────────────────────────┘   │ │
│  │                                                │ │
│  │ ┌─────────────────────────────────────────┐   │ │
│  │ │ 📄 Resume Title                         │   │ │
│  │ │ 👤 John Smith (john@example.com)       │   │ │
│  │ │ #456def                                 │   │ │
│  │ │ ... (more results)                      │   │ │
│  │ └─────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Profile Settings Component

### Job Seeker View

```
┌──────────────────────────────────────────┐
│ ⚙️  PROFILE SETTINGS                     │
├──────────────────────────────────────────┤
│ Email: jobseeker@email.com               │
│ Account Type: 🟦 Job Seeker             │
├──────────────────────────────────────────┤
│                                          │
│ Recruiter Account             [OFF] ◯─  │
│ Enable this to access recruiter          │
│ features and search for candidates       │
│                                          │
└──────────────────────────────────────────┘
```

### Recruiter View (After Toggle)

```
┌──────────────────────────────────────────┐
│ ⚙️  PROFILE SETTINGS                     │
├──────────────────────────────────────────┤
│ Email: recruiter@company.com             │
│ Account Type: 🟨 Recruiter              │
├──────────────────────────────────────────┤
│                                          │
│ Recruiter Account             [ON] ─◯   │
│ You can now search for and contact      │
│ candidates                               │
├──────────────────────────────────────────┤
│ Company Name                             │
│ [Enter company name] [SAVE]              │
│                                          │
│ ✅ Settings updated successfully!       │
│                                          │
└──────────────────────────────────────────┘
```

---

## Recruiter Search Box Component

### Initial State (No Search)

```
┌──────────────────────────────────────────┐
│ 🔍 RECRUITER RESUME SEARCH               │
├──────────────────────────────────────────┤
│ [Search Box...............] [SEARCH]    │
│                                          │
│ 💡 Tip: Search by resume number, skills│
│ or candidate name to find resumes        │
├──────────────────────────────────────────┤
│                                          │
│              🔍                          │
│        Start searching for               │
│         candidate resumes                │
│    Use the search box above to find      │
│           candidates                     │
│                                          │
└──────────────────────────────────────────┘
```

### Search Results Display

```
┌──────────────────────────────────────────┐
│ Found 3 resumes                          │
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 📄 Senior React Developer             ││
│ │ 👤 Alice Johnson                      ││
│ │ 📧 alice@example.com                  ││
│ │ #abc123                               ││
│ │                                       ││
│ │ 5+ years experience with modern web   ││
│ │ frameworks and cloud technologies.    ││
│ │                                       ││
│ │ Skills:                               ││
│ │ React • TypeScript • Node.js          ││
│ │ • AWS • PostgreSQL +2 more            ││
│ │                                       ││
│ │ [View Resume] [Request Access]        ││
│ │ Posted: Nov 15, 2025                  ││
│ └──────────────────────────────────────┘│
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ (More results...)                     ││
│ └──────────────────────────────────────┘│
│                                          │
└──────────────────────────────────────────┘
```

### No Results State

```
┌──────────────────────────────────────────┐
│ 🔍 RECRUITER RESUME SEARCH               │
├──────────────────────────────────────────┤
│ [Search Box...............] [SEARCH]    │
│                                          │
│ ❌ No resumes found matching your        │
│    search.                               │
│                                          │
│              ❌                          │
│        No resumes found                  │
│    Try searching with different          │
│            keywords                      │
│                                          │
└──────────────────────────────────────────┘
```

---

## User Interaction Flows

### Flow 1: Enable Recruiter Mode

```
User visits dashboard
        ↓
Sees Profile Settings card
        ↓
Toggle "Recruiter Account" ON
        ↓
Enter company name
        ↓
Click "Save"
        ↓
✅ Success notification appears
        ↓
RecruiterSearchBox component appears
        ↓
User can now search for candidates
```

### Flow 2: Search for Candidates

```
User in Recruiter SearchBox
        ↓
Types in search box (e.g., "React")
        ↓
Clicks "Search" button
        ↓
Loading state (spinner)
        ↓
Results appear (up to 20)
        ↓
User can:
  ├─ View Resume (opens in new tab)
  └─ Request Access (sends notification)
```

### Flow 3: Request Access to Candidate

```
User clicks "Request Access"
        ↓
API sends request to backend
        ↓
Creates recruiterRequests document
        ↓
Increments request counter
        ↓
✅ Success message shows
        ↓
Candidate receives notification
        ↓
Candidate can approve/deny
```

---

## API Response Examples

### GET /api/user/settings

**Request:**

```
GET /api/user/settings?userId=user123
```

**Response (200):**

```json
{
  "isRecruiter": true,
  "displayName": "Jane Doe",
  "companyName": "Tech Recruiter Inc",
  "updatedAt": "2025-11-16T10:30:00Z"
}
```

---

### GET /api/recruiter/search

**Request:**

```
GET /api/recruiter/search?q=React
```

**Response (200):**

```json
{
  "results": [
    {
      "resumeId": "abc123def456",
      "title": "Senior Frontend Developer",
      "userName": "John Smith",
      "userEmail": "john@example.com",
      "slug": "john-smith-frontend",
      "createdAt": "2025-11-15T00:00:00Z",
      "skills": ["React", "TypeScript", "Node.js"],
      "summary": "Experienced frontend developer..."
    }
  ],
  "count": 1,
  "query": "React"
}
```

---

### POST /api/recruiter/request-access

**Request:**

```
POST /api/recruiter/request-access
Content-Type: application/json

{
  "resumeId": "abc123def456",
  "requestedFields": ["email", "phone"]
}
```

**Response (200):**

```json
{
  "success": true,
  "requestId": "req789xyz",
  "message": "Access request sent successfully..."
}
```

---

## UI Color Scheme

### Components

**Profile Settings Card:**

- Border: `border-cyan-500/30` (hover)
- Header Icons: Gradient `cyan-500 to purple-600`
- Buttons: Gradient `cyan-500 to blue-600`

**Recruiter Search Box:**

- Border: `border-amber-500/30` (hover)
- Header Icons: Gradient `amber-500 to orange-600`
- Search Button: Gradient `amber-500 to orange-600`
- Result Cards: `bg-white/5` with white/10 borders

**Status Indicators:**

- Job Seeker: 🟦 Cyan text
- Recruiter: 🟨 Amber text
- Success: Green/teal
- Error: Red/pink
- Loading: Spinner with cyan

---

## Responsive Design

### Desktop (1024px+)

- Profile Settings: Full width card
- Dashboard Stats: 3 column grid
- Search Results: Full card layout
- Components: Full sidebar interactions

### Tablet (768px - 1023px)

- Profile Settings: Full width card
- Dashboard Stats: 2 column grid
- Search Results: Full card layout
- Components: Touch-optimized buttons

### Mobile (< 768px)

- Profile Settings: Stack vertically
- Dashboard Stats: 1 column
- Search Results: Stack vertically
- Buttons: Large touch targets
- Input fields: Full width

---

## States & Transitions

### Loading States

```
[Loading...] → API call in progress
Spinner appears with "Searching..." text
User cannot interact during loading
```

### Success States

```
✅ Settings updated successfully!
(Green notification, 3-second auto-dismiss)

✅ Access request sent!
(Green notification, auto-dismiss)
```

### Error States

```
❌ Failed to save settings. Please try again.
(Red notification, persistent until action)

❌ No resumes found matching your search.
(Red notification with suggestions)
```

### Empty States

```
- No search performed: "Start searching..."
- No results: "No resumes found..."
- Settings loading: Skeleton/pulse animation
```

---

## Accessibility Features

✅ Semantic HTML structure  
✅ ARIA labels on interactive elements  
✅ Keyboard navigation support  
✅ Color contrast meets WCAG AA  
✅ Focus indicators visible  
✅ Error messages associated with inputs  
✅ Loading states announced  
✅ Alternative text for icons

---

## Performance Optimizations

✅ Lazy loading components  
✅ Efficient Firestore queries  
✅ Result limiting (20 per search)  
✅ Debounced search inputs  
✅ Optimized re-renders  
✅ Minimal bundle impact

---

Generated: November 16, 2025  
Version: 1.0
