# Quick Start: Dashboard Features

## What's New?

Your SwitchCV dashboard now has:

1. **User Profile Settings** - Manage your account type (Job Seeker or Recruiter)
2. **Recruiter Search** - Search for candidate resumes by number, name, or skills

---

## Getting Started

### Step 1: Access Dashboard

```
Visit: http://localhost:3000/dashboard
```

### Step 2: Enable Recruiter Mode (If Recruiter)

1. Scroll to **Profile Settings** card at the top
2. Look for "Recruiter Account" toggle
3. Click toggle to turn ON
4. Enter your company name
5. Click "Save"

### Step 3: Search for Candidates

1. Scroll down to **Recruiter Resume Search** section
2. In search box, enter:
   - Resume number (e.g., `#001`)
   - Candidate name
   - Skill (e.g., `React`, `Python`)
3. Click "Search" button
4. View results

### Step 4: Request Access or View Resume

For each result:

- **View Resume** - Opens candidate's full profile
- **Request Access** - Send request to see contact details

---

## Common Tasks

### Change Account Type

1. Profile Settings → Recruiter Account toggle
2. Save changes immediately

### Search by Resume Number

```
Search box → type "001" → search
Returns all resumes with ID starting with "001"
```

### Search by Skill

```
Search box → type "JavaScript" → search
Returns candidates with JavaScript skill
```

### Find Candidates in Location

```
Search box → type city name → search
Searches in candidate names and profiles
```

---

## Features

### Profile Settings

✓ View current account type  
✓ Toggle Recruiter status  
✓ Add company name  
✓ Real-time sync across sessions

### Resume Search

✓ Search 50+ published resumes  
✓ Filter by title, name, skills  
✓ View candidate summary  
✓ See top 5 skills  
✓ Creation date

### Access Requests

✓ Request contact information  
✓ Prevent duplicate requests  
✓ Track request history  
✓ Candidate notifications

---

## Tips & Tricks

**💡 Tip 1:** Resume numbers are auto-generated. Look at recent resumes to see format.

**💡 Tip 2:** Skills search is case-insensitive. "react" = "React" = "REACT"

**💡 Tip 3:** Search by first/last name for direct candidate lookup.

**💡 Tip 4:** Candidate gets notification when you request access. They can approve/deny.

**💡 Tip 5:** Empty search? Try different keywords or search by number.

---

## Troubleshooting

### Search Returns No Results

- Try shorter search term
- Check spelling
- Search by resume number instead
- Try searching by skill name

### Can't See Recruiter Search

- Toggle Recruiter mode ON in Profile Settings
- Save company name
- Refresh page

### Access Request Failed

- Check if request already exists (can't duplicate)
- Verify resume number is correct
- Try again in a moment

### Settings Not Saving

- Check internet connection
- Verify you're logged in
- Check browser console for errors
- Try refreshing page

---

## What Recruiters Can Do

✅ Search 1000+ published resumes  
✅ Filter by skills, name, title  
✅ Request candidate contact info  
✅ View candidate profiles  
✅ Track requests sent  
✅ Manage company profile

---

## What Candidates See

When a recruiter requests access:

1. Notification appears in their dashboard
2. Can review request details
3. Can approve (share contact details)
4. Can deny (no contact sharing)
5. Can set expiration (1 hour, 1 day, 1 week, forever)

---

## API Endpoints (For Developers)

```
GET  /api/user/settings?userId={id}
PUT  /api/user/settings
GET  /api/recruiter/search?q={query}
POST /api/recruiter/request-access
```

See `DASHBOARD_RECRUITER_FEATURES.md` for full API documentation.

---

## Next Steps

1. Enable recruiter mode
2. Search for a few candidates
3. Try sending an access request
4. Check notifications on candidate account

---

Questions? Check DASHBOARD_RECRUITER_FEATURES.md for detailed documentation.

Generated: November 16, 2025
