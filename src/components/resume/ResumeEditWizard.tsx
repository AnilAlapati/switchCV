"use client";

import { useMemo } from "react";
import type { ResumeProfile } from "@/types";
import { BasicInfoStep } from "@/components/onboarding/steps/BasicInfoStep";
import { ExperienceStep } from "@/components/onboarding/steps/ExperienceStep";
import { EducationStep } from "@/components/onboarding/steps/EducationStep";
import { SkillsStep } from "@/components/onboarding/steps/SkillsStep";
import { ProjectsStep } from "@/components/onboarding/steps/ProjectsStep";
import { ContactStep } from "@/components/onboarding/steps/ContactStep";
import { ReviewStep } from "@/components/onboarding/steps/ReviewStep";
import {
  NavigationButtons,
  ProgressBar,
  StepHeader,
  StepIndicator,
} from "@/components/onboarding/Navigation";
import type { ResumeEditorMeta } from "@/lib/utils/resumeEditor";

export type SaveState = "idle" | "saving" | "success" | "error";

interface CollectionHandlers<T> {
  add: () => void;
  update: (index: number, updates: Partial<T>) => void;
  remove: (index: number) => void;
}

interface ResumeEditWizardProps {
  profile: Partial<ResumeProfile>;
  steps: string[];
  currentStep: number;
  meta: ResumeEditorMeta | null;
  saveState: SaveState;
  saveError: string | null;
  isDirty: boolean;
  onProfileChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onStepChange: (step: number) => void;
  onSave: () => void;
  onDirty: () => void;
  experience: CollectionHandlers<ResumeProfile["experience"][number]>;
  education: CollectionHandlers<ResumeProfile["education"][number]>;
  skills: CollectionHandlers<ResumeProfile["skills"][number]>;
  projects: CollectionHandlers<ResumeProfile["projects"][number]>;
}

const wrapHandlers = <T,>(
  handlers: CollectionHandlers<T>,
  onDirty: () => void
): CollectionHandlers<T> => ({
  add: () => {
    onDirty();
    handlers.add();
  },
  update: (index, updates) => {
    onDirty();
    handlers.update(index, updates);
  },
  remove: (index) => {
    onDirty();
    handlers.remove(index);
  },
});

export function ResumeEditWizard({
  profile,
  steps,
  currentStep,
  meta,
  saveState,
  saveError,
  isDirty,
  onProfileChange,
  onNext,
  onPrevious,
  onStepChange,
  onSave,
  onDirty,
  experience,
  education,
  skills,
  projects,
}: ResumeEditWizardProps) {
  const experienceActions = useMemo(
    () => wrapHandlers(experience, onDirty),
    [experience, onDirty]
  );
  const educationActions = useMemo(
    () => wrapHandlers(education, onDirty),
    [education, onDirty]
  );
  const skillsActions = useMemo(
    () => wrapHandlers(skills, onDirty),
    [skills, onDirty]
  );
  const projectsActions = useMemo(
    () => wrapHandlers(projects, onDirty),
    [projects, onDirty]
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep profile={profile} onChange={onProfileChange} />;
      case 1:
        return (
          <ExperienceStep
            experience={profile.experience || []}
            onAdd={experienceActions.add}
            onUpdate={experienceActions.update}
            onRemove={experienceActions.remove}
          />
        );
      case 2:
        return (
          <EducationStep
            education={profile.education || []}
            onAdd={educationActions.add}
            onUpdate={educationActions.update}
            onRemove={educationActions.remove}
          />
        );
      case 3:
        return (
          <SkillsStep
            skills={profile.skills || []}
            onAdd={skillsActions.add}
            onUpdate={skillsActions.update}
            onRemove={skillsActions.remove}
          />
        );
      case 4:
        return (
          <ProjectsStep
            projects={profile.projects || []}
            onAdd={projectsActions.add}
            onUpdate={projectsActions.update}
            onRemove={projectsActions.remove}
          />
        );
      case 5:
        return <ContactStep profile={profile} onChange={onProfileChange} />;
      case 6:
        return <ReviewStep profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <StepHeader
          stepNumber={currentStep}
          stepName={steps[currentStep]}
          totalSteps={steps.length}
          title="Edit Your Resume"
        />
        <div className="mt-4">
          <ProgressBar currentStep={currentStep} totalSteps={steps.length} />
        </div>
        {meta && (
          <div className="mt-4 text-sm text-gray-600 flex flex-wrap gap-4">
            {meta.numericId && <span>ID #{meta.numericId}</span>}
            {meta.visibility && (
              <span>
                Visibility:{" "}
                {meta.visibility === "public" ? "Public" : "Private"}
              </span>
            )}
          </div>
        )}
        {saveState === "success" && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Resume updated successfully.
          </div>
        )}
        {saveState === "error" && saveError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {saveError}
          </div>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 lg:p-8">
        {renderStep()}
      </div>

      <div className="mt-8">
        <NavigationButtons
          currentStep={currentStep}
          totalSteps={steps.length}
          onPrevious={onPrevious}
          onNext={onNext}
          onComplete={onSave}
          nextLabel="Next →"
          completeLabel={saveState === "saving" ? "Saving..." : "Save Changes"}
          isNextDisabled={saveState === "saving"}
          isCompleteDisabled={saveState === "saving" || !isDirty}
        />
        {!isDirty && currentStep === steps.length - 1 && (
          <p className="mt-2 text-sm text-gray-500">
            No changes to save. Update any section to enable saving.
          </p>
        )}
      </div>

      <div className="mt-8">
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepChange}
        />
      </div>
    </div>
  );
}
