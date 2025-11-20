# Phase 2 Refactoring - Quick Reference

## What Was Refactored

Two large onboarding page components:

- `src/app/onboarding/page.tsx` (896 → 174 lines)
- `src/app/onboarding/page-with-preview.tsx` (914 → 184 lines)

## New Structure

### 1. Custom Hook

```tsx
import { useProfileForm } from "@/hooks/useProfileForm";

const {
  profile,
  updateProfile,
  experience, // { add, update, remove }
  education, // { add, update, remove }
  skills, // { add, update, remove }
  projects, // { add, update, remove }
} = useProfileForm();
```

### 2. Step Components

```tsx
// Each step is a separate component:
<BasicInfoStep profile={profile} onChange={updateProfile} />
<ExperienceStep experience={arr} onAdd={fn} onUpdate={fn} onRemove={fn} />
<EducationStep education={arr} onAdd={fn} onUpdate={fn} onRemove={fn} />
<SkillsStep skills={arr} onAdd={fn} onUpdate={fn} onRemove={fn} />
<ProjectsStep projects={arr} onAdd={fn} onUpdate={fn} onRemove={fn} />
<ContactStep profile={profile} onChange={updateProfile} />
<ReviewStep profile={profile} />
```

### 3. Form Components

```tsx
import { FormInput, FormTextarea, FormSelect, VisibilityControl } from "@/components/onboarding/FormComponents";

// Use these for consistent form UI:
<FormInput label="Name" value={value} onChange={handler} />
<FormTextarea label="Description" value={value} onChange={handler} rows={3} />
<FormSelect label="Level" value={val} onChange={handler} options={opts} />
<VisibilityControl value={visibility} onChange={handler} />
```

### 4. Navigation Components

```tsx
import { StepHeader, ProgressBar, NavigationButtons, StepIndicator } from "@/components/onboarding/Navigation";

// These components handle all navigation UI
<StepHeader stepNumber={current} stepName={name} totalSteps={total} />
<ProgressBar currentStep={current} totalSteps={total} />
<NavigationButtons currentStep={current} totalSteps={total} onPrevious={fn} onNext={fn} onComplete={fn} />
<StepIndicator steps={names} currentStep={current} onStepClick={fn} />
```

## File Locations

```
src/
├── hooks/
│   └── useProfileForm.ts                    ← Profile state & handlers
├── components/
│   └── onboarding/
│       ├── FormComponents.tsx               ← Reusable form fields
│       ├── Navigation.tsx                   ← Navigation UI
│       └── steps/                           ← Step components
│           ├── BasicInfoStep.tsx
│           ├── ExperienceStep.tsx
│           ├── EducationStep.tsx
│           ├── SkillsStep.tsx
│           ├── ProjectsStep.tsx
│           ├── ContactStep.tsx
│           └── ReviewStep.tsx
└── app/
    └── onboarding/
        ├── page.tsx                         ← Main onboarding page (refactored)
        └── page-with-preview.tsx            ← Preview variant (refactored)
```

## How to Extend

### Add a New Step

1. Create `/src/components/onboarding/steps/NewStep.tsx`:

```tsx
interface NewStepProps {
  data: YourDataType;
  onChange: (updates: Partial<YourDataType>) => void;
}

export function NewStep({ data, onChange }: NewStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Step Title</h3>
      {/* Your form fields */}
    </div>
  );
}
```

2. Add to page.tsx:

```tsx
const STEPS = [
  "Basic Info",
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Contact",
  "New Step", // ← Add here
  "Review",
];

const renderStep = () => {
  switch (currentStep) {
    // ... existing cases ...
    case 7:
      return (
        <NewStep
          data={profile.newData}
          onChange={(updates) => updateProfile(updates)}
        />
      );
  }
};
```

### Add Form Fields

Use the FormComponents library:

```tsx
import {
  FormInput,
  FormTextarea,
  FormSelect,
} from "@/components/onboarding/FormComponents";

<FormInput
  label="Your Label"
  type="text"
  value={value}
  onChange={(e) => onUpdate({ field: e.target.value })}
  placeholder="..."
/>;
```

### Modify Profile Management

Edit `/src/hooks/useProfileForm.ts` to add new sections:

```tsx
const addCustom = () => {
  const newItem = {
    /* default values */
  };
  updateProfile({
    custom: [...(profile.custom || []), newItem],
  });
};

return {
  // ... existing returns ...
  custom: {
    add: addCustom,
    update: updateCustom,
    remove: removeCustom,
  },
};
```

## Testing Each Component

### Test a Step Component

```tsx
import { render, screen } from "@testing-library/react";
import { BasicInfoStep } from "@/components/onboarding/steps/BasicInfoStep";

test("renders basic info step", () => {
  const mockProfile = { title: "", summary: "" };
  const mockOnChange = jest.fn();

  render(<BasicInfoStep profile={mockProfile} onChange={mockOnChange} />);

  expect(
    screen.getByPlaceholderText(/Software Engineer Resume/)
  ).toBeInTheDocument();
});
```

### Test the Hook

```tsx
import { renderHook, act } from "@testing-library/react";
import { useProfileForm } from "@/hooks/useProfileForm";

test("adds experience", () => {
  const { result } = renderHook(() => useProfileForm());

  act(() => {
    result.current.experience.add();
  });

  expect(result.current.profile.experience).toHaveLength(1);
});
```

## Debugging Tips

### Check Profile State

```tsx
console.log("Current profile:", profile);
```

### Check Hook Return

```tsx
const hook = useProfileForm();
console.log("Experience handlers:", hook.experience);
```

### Verify Step Component Props

Pass test data:

```tsx
<ExperienceStep
  experience={[]}
  onAdd={() => console.log("add")}
  onUpdate={(idx, updates) => console.log("update", idx, updates)}
  onRemove={(idx) => console.log("remove", idx)}
/>
```

## Performance Notes

- Each step only renders when active
- Form components use React.memo-ready structure
- Hook doesn't cause unnecessary re-renders
- Consider memoizing step components if needed:

```tsx
const BasicInfoStepMemo = React.memo(BasicInfoStep);
```

## Common Issues & Solutions

### Issue: "Cannot find module" errors

**Solution:** Check import paths use correct relative paths from file location

### Issue: TypeScript errors on form handlers

**Solution:** Ensure handler types match: `(e: ChangeEvent<HTMLInputElement>) => void`

### Issue: Step doesn't update when navigating

**Solution:** Verify `useProfileForm()` is called before using it

### Issue: Form not submitting

**Solution:** Check `handleSubmit` function and Firestore integration (TODO in code)

## Next Steps

1. ✅ Refactoring complete
2. ⏳ Add form validation
3. ⏳ Implement Firestore saving
4. ⏳ Add error handling
5. ⏳ Add success notifications
6. ⏳ Write comprehensive tests

## Summary

The refactored code is:

- **Cleaner**: 80% less code in page components
- **Modular**: Each step is independent
- **Reusable**: Share logic via hooks and components
- **Testable**: Isolated components are easier to test
- **Maintainable**: Clear separation of concerns
