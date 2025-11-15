# Advanced UI Features - Quick Reference Guide

**Last Updated:** November 15, 2025

---

## 🚀 Quick Start

### Access the Onboarding Form

```
URL: http://localhost:3000/app/onboarding
```

### Two Variants Available:

#### 1. Standard Onboarding (Default)

**File:** `/src/app/onboarding/page.tsx`

- Multi-step form
- 7 complete steps
- Responsive design
- Perfect for mobile-first

#### 2. Enhanced with Preview (Recommended for Desktop)

**File:** `/src/app/onboarding/page-with-preview.tsx`

- Split-screen layout
- Live preview
- Form on left, resume on right
- Sticky preview on desktop

---

## 📋 Form Steps Overview

| Step | Name       | Fields                                  | Add/Remove |
| ---- | ---------- | --------------------------------------- | ---------- |
| 1    | Basic Info | Title, Summary                          | No         |
| 2    | Experience | Company, Role, Dates, Description       | Yes        |
| 3    | Education  | Institution, Degree, Dates, Description | Yes        |
| 4    | Skills     | Name, Proficiency Level                 | Yes        |
| 5    | Projects   | Name, URL, Description                  | Yes        |
| 6    | Contact    | Email, Phone                            | No         |
| 7    | Review     | Summary of all data                     | No         |

---

## 🎯 Key Components

### VisibilityControls

Control who can see each field.

```tsx
import { VisibilityControls } from "@/components/VisibilityControls";

<VisibilityControls
  value={visibility}
  onChange={(newValue) => setVisibility(newValue)}
  label="Who can see this?"
  showLabels={true}
/>;
```

**Options:**

- 🌍 **Public** - Everyone can see
- 🔒 **Masked** - Hidden, can request
- 🔑 **Request** - Requires approval

### ResumePreview

Live preview of the resume.

```tsx
import { ResumePreview } from "@/components/ResumePreview";

<ResumePreview profile={profileData} />;
```

### ResumePreviewPanel

Form + Preview side-by-side.

```tsx
import { ResumePreviewPanel } from "@/components/ResumePreview";

<ResumePreviewPanel profile={profileData}>
  {/* Your form here */}
</ResumePreviewPanel>;
```

---

## 🎨 Styling Classes

### Common Responsive Classes:

```tsx
// Padding/Margin
className = "px-4 sm:px-6 lg:px-8";

// Grid Layout
className = "grid grid-cols-1 md:grid-cols-2 gap-4";

// Typography
className = "text-sm sm:text-base";

// Buttons
className = "w-full sm:w-auto";

// Flex Direction
className = "flex flex-col sm:flex-row";
```

### Colors:

- Primary: `bg-indigo-600`, `text-indigo-600`
- Success: `bg-green-100`, `text-green-800`
- Warning: `bg-yellow-100`, `text-yellow-800`
- Info: `bg-blue-100`, `text-blue-800`

---

## 💡 Usage Examples

### Adding Experience Entry

```tsx
const addExperience = () => {
  const newExperience = {
    company: "",
    role: "",
    startDate: "",
    description: "",
    visibility: "public",
  };
  setExperience([...experience, newExperience]);
};
```

### Managing Visibility

```tsx
const updateVisibility = (field, newVisibility) => {
  setProfile((prev) => ({
    ...prev,
    [field]: {
      ...prev[field],
      visibility: newVisibility,
    },
  }));
};
```

### Displaying Preview

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Form on left */}
  <div>{formContent}</div>

  {/* Preview on right */}
  <div className="lg:sticky lg:top-0">
    <ResumePreview profile={profile} />
  </div>
</div>
```

---

## 📱 Responsive Breakpoints

| Device  | Width       | Layout                    |
| ------- | ----------- | ------------------------- |
| Mobile  | < 640px     | Single column, full width |
| Tablet  | 640-1024px  | 1-2 columns               |
| Desktop | 1024-1440px | Side-by-side with preview |
| Wide    | > 1440px    | Full width with spacing   |

---

## ✅ Validation Tips

### Before Submission, Check:

- [ ] Title is filled
- [ ] At least one experience entry
- [ ] At least one education entry
- [ ] At least one skill
- [ ] Email is valid format
- [ ] All required fields have content

### Form State Structure:

```tsx
{
  title: string,
  summary: string,
  experience: [{
    company: string,
    role: string,
    startDate: string,
    endDate?: string,
    description: string,
    visibility: "public" | "masked" | "request"
  }],
  education: [{
    institution: string,
    degree: string,
    startDate: string,
    endDate?: string,
    description?: string,
    visibility: "public" | "masked" | "request"
  }],
  skills: [{
    name: string,
    level: "beginner" | "intermediate" | "advanced" | "expert",
    visibility: "public" | "masked" | "request"
  }],
  projects: [{
    name: string,
    url?: string,
    description: string,
    visibility: "public" | "masked" | "request"
  }],
  contact: {
    email: { value: string, visibility: "public" | "masked" | "request" },
    phone: { value: string, visibility: "public" | "masked" | "request" }
  }
}
```

---

## 🐛 Common Issues & Solutions

### Issue: Form not updating

**Solution:** Check if you're using the spread operator correctly

```tsx
// ✅ Correct
setProfile((prev) => ({ ...prev, title: newValue }));

// ❌ Wrong
setProfile({ title: newValue });
```

### Issue: Preview not showing

**Solution:** Ensure profile has data

```tsx
// ✅ Will show
<ResumePreview profile={{ title: "My Resume" }} />

// ❌ Shows empty state
<ResumePreview profile={{}} />
```

### Issue: Mobile buttons too small

**Solution:** Use w-full on mobile

```tsx
className = "w-full sm:w-auto px-6 py-2";
```

---

## 📊 Data Flow

```
User Input
    ↓
Form Component (handleChange)
    ↓
State Update (setProfile)
    ↓
Preview Component (live update)
    ↓
User sees real-time preview
```

---

## 🔗 File References

### Main Files:

- `/src/app/onboarding/page.tsx` - Default form (903 lines)
- `/src/app/onboarding/page-with-preview.tsx` - Enhanced form (850 lines)

### Components:

- `/src/components/VisibilityControls.tsx` - Privacy controls (126 lines)
- `/src/components/ResumePreview.tsx` - Preview component (315 lines)

### Tests:

- `/src/__tests__/app/onboarding/complete-form.test.tsx` - Form tests
- `/src/__tests__/components/VisibilityControls.test.tsx` - Control tests
- `/src/__tests__/components/ResumePreview.test.tsx` - Preview tests

### Documentation:

- `/ADVANCED_UI_FEATURES.md` - Complete documentation
- `/IMPLEMENTATION_SUMMARY_ADVANCED_UI.md` - Implementation summary

---

## 🎯 Common Tasks

### Task: Change Primary Color

```tsx
// In Tailwind CSS, change all:
bg-indigo-600 → bg-[your-color]-600
text-indigo-600 → text-[your-color]-600
```

### Task: Add Required Field Indicator

```tsx
<label className="block text-sm font-medium text-gray-700">
  Field Name <span className="text-red-600">*</span>
</label>
```

### Task: Add Placeholder Help Text

```tsx
<p className="mt-1 text-xs text-gray-500">e.g., Senior Software Engineer</p>
```

### Task: Add Validation Error

```tsx
{
  errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>;
}
```

---

## 📈 Performance Tips

1. **For Large Forms:** Use React.memo for form sections
2. **For Preview:** Consider debouncing updates
3. **For Mobile:** Avoid overflow-x scroll
4. **For Accessibility:** Always include labels

---

## 🚀 Deployment Checklist

- [ ] All tests pass
- [ ] TypeScript compilation succeeds
- [ ] No console errors
- [ ] Mobile layout tested
- [ ] Accessibility verified
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Ready for production

---

## 📞 Quick Links

- **Form Page:** `/src/app/onboarding/page.tsx`
- **Components:** `/src/components/`
- **Tests:** `/src/__tests__/`
- **Docs:** `/ADVANCED_UI_FEATURES.md`

---

## 💬 Notes

- All components are fully typed with TypeScript
- All tests are comprehensive and passing
- Mobile-first responsive design
- WCAG 2.1 AA accessible
- Production-ready code

---

**Last Updated:** November 15, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete
