# Resume Creation System - Quick Start Guide

## Using the System

### For End Users

```tsx
import { ResumeCreationFlow } from "@/components/ResumeCreationFlow";

export default function CreateResumePage() {
  return (
    <ResumeCreationFlow
      userId={user.uid}
      onComplete={(resumeId) => {
        // Navigate to public resume
        router.push(`/resumes/${resumeId}`);
      }}
    />
  );
}
```

### User Flow

1. **Start**: User clicks "Create Resume with AI"
2. **Q&A Phase**: Answers 20+ questions one at a time
3. **Generate**: Watches animated loader (3-8 seconds)
4. **Review**: Sees generated resume in beautiful modal
5. **Refine**: Can request up to 5 rewrites with feedback
6. **Save**: Clicks "Accept & Save"
7. **Share**: Gets public URL like `/resumes/123456`

---

## For Developers

### Component Props

**ResumeCreationFlow**:

```typescript
interface ResumeCreationFlowProps {
  userId: string; // Firebase UID
  onComplete?: (resumeId: string) => void;
}
```

**ResumeQAForm**:

```typescript
interface ResumeQAFormProps {
  onComplete: (data: ResumeData) => void;
  onCancel: () => void;
}
```

**ResumeReviewModal**:

```typescript
interface ResumeReviewModalProps {
  resume: Resume;
  isOpen: boolean;
  onAccept: () => Promise<void>;
  onRewrite: (feedback: string) => Promise<void>;
  isLoading?: boolean;
  retryCount?: number;
  maxRetries?: number;
}
```

---

## API Integration

### Save Resume Endpoint

```bash
POST /api/resumes/create
Content-Type: application/json

{
  "userId": "firebase-uid",
  "resume": {
    "id": "resume_1234567890",
    "title": "John Doe's Resume",
    "summary": "...",
    "skills": ["React", "TypeScript"],
    "experience": [...],
    "education": [...]
  },
  "isPublic": true
}
```

**Response**:

```json
{
  "success": true,
  "resumeId": "123456",
  "numericId": 123456,
  "publicUrl": "/resumes/123456"
}
```

---

## Setup Steps

### 1. Add to Create Resume Page

```tsx
// src/app/create-resume/page.tsx

import { ResumeCreationFlow } from "@/components/ResumeCreationFlow";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function CreateResumePage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to create a resume</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ResumeCreationFlow
        userId={user.uid}
        onComplete={(resumeId) => {
          router.push(`/resumes/${resumeId}`);
        }}
      />
    </div>
  );
}
```

### 2. Verify Firebase Admin Setup

Ensure environment variables are set:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
```

### 3. Test the Flow

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to /create-resume
# 3. Fill out Q&A form
# 4. Watch AI generation
# 5. Review and save
# 6. Navigate to /resumes/{numericId}
```

---

## Customization

### Change Max Rewrites

```tsx
// In ResumeCreationFlow.tsx
const maxRetries = 3;  // Instead of 5

<ResumeReviewModal
  maxRetries={maxRetries}
  ...
/>
```

### Customize Questions

```tsx
// src/config/resumeQuestions.ts
export const resumeQuestions: Question[] = [
  {
    id: "name",
    text: "What is your full name?", // Customize text
    category: "personal",
    required: true,
    placeholder: "Enter your name",
    validation: {
      minLength: 2,
      maxLength: 100,
    },
  },
  // Add more custom questions
];
```

### Change UI Colors

```tsx
// ResumeReviewModal.tsx - Replace color classes
className = "text-cyan-400"; // Change to your color
className = "bg-gradient-to-r from-cyan-500 to-blue-500";
```

---

## Troubleshooting

### Issue: "Failed to generate resume"

**Solution**: Check useAIResume hook and AI service status

- Verify API keys are set
- Check Firebase Cloud Functions are deployed
- Ensure Gemini/HuggingFace APIs are available

### Issue: "Failed to save resume"

**Solution**: Check API endpoint and Firestore

- Verify `/api/resumes/create` exists
- Check Firebase Admin setup
- Ensure Firestore collections exist

### Issue: "Maximum ID limit reached"

**Solution**: ID counter exceeded 99,999,999

- This happens after 100M+ resumes
- Contact admin for counter reset
- Or implement ID recycling from deleted resumes

### Issue: "Unauthorized - Cannot save resume"

**Solution**: User ID mismatch

- Ensure user is authenticated
- Check token matches userId
- Remove Bearer token if not using auth

---

## Performance Optimization

### Caching

```tsx
// Disable if needed
<ResumeGenerationLoader
  status="generating"
  message="Generating your resume..."
/>
```

### Lazy Loading

```tsx
import dynamic from "next/dynamic";

const ResumeReviewModal = dynamic(
  () =>
    import("@/components/ResumeReviewModal").then(
      (mod) => mod.ResumeReviewModal
    ),
  { loading: () => <div>Loading...</div> }
);
```

### ISR for Public Resumes

```tsx
// pages/resumes/[id]/page.tsx
export const revalidate = 60; // Revalidate every 60 seconds
```

---

## Monitoring

### Log AI Generation

```typescript
// useAIResume hook logs:
console.log("🤖 AI CALL STARTING");
console.log("✅ AI CALL SUCCESS");
console.log("❌ AI CALL FAILED");
```

### Log Resume Save

```typescript
// /api/resumes/create logs:
console.log("✅ Resume saved successfully", {
  userId,
  numericId,
  resumeTitle,
  isPublic,
});
```

### Monitor Firestore

```typescript
// Check document creation
db.collection("resumes")
  .doc(userId)
  .collection("resumes")
  .orderBy("createdAt", "desc")
  .limit(10)
  .get();
```

---

## Testing

### Unit Test Example

```typescript
// __tests__/components/ResumeQAForm.test.tsx

import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeQAForm } from "@/components/ResumeQAForm";

describe("ResumeQAForm", () => {
  it("renders first question", () => {
    const mockOnComplete = jest.fn();
    render(<ResumeQAForm onComplete={mockOnComplete} onCancel={() => {}} />);

    expect(screen.getByText(/first question text/i)).toBeInTheDocument();
  });

  it("advances to next question", () => {
    // Test navigation
  });

  it("validates answer", () => {
    // Test validation
  });
});
```

### Integration Test

```bash
# Test full flow
npm run test:e2e

# Scenarios:
# 1. Complete Q&A → See generation → Review → Save → Redirect
# 2. Test rewrite loop (5 attempts)
# 3. Test error handling
```

---

## Best Practices

✅ Always wrap in authentication check  
✅ Provide loading states  
✅ Handle network errors gracefully  
✅ Use proper TypeScript types  
✅ Log important events for debugging  
✅ Test with real Firebase project  
✅ Monitor API performance  
✅ Cache public resumes with ISR

---

## File Reference

```
src/components/
  ├─ ResumeQAForm.tsx (284 lines)
  ├─ ResumeGenerationLoader.tsx (185 lines)
  ├─ ResumeReviewModal.tsx (285 lines)
  └─ ResumeCreationFlow.tsx (253 lines)

src/app/api/
  └─ resumes/create/route.ts (125 lines)

src/hooks/
  └─ useAIResume.tsx (existing)

src/lib/
  ├─ numericIdGenerator.ts (existing)
  └─ resumeComparison.types.ts (existing)

src/config/
  └─ resumeQuestions.ts (existing)
```

---

## Support & Resources

- **Issues**: Check PHASES_1_TO_4_COMPLETE.md
- **API Docs**: See PHASE4_COMPLETE.md
- **Component Docs**: See PHASE2_3_COMPLETE.md
- **Questions**: See PHASE1_COMPLETE.md

---

**Happy Resume Creating! 🚀**
