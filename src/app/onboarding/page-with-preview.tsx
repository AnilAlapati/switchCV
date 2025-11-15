"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useProfileForm } from "@/hooks/useProfileForm";
import { ResumePreviewPanel } from "@/components/ResumePreview";
import { BasicInfoStep } from "@/components/onboarding/steps/BasicInfoStep";
import { ExperienceStep } from "@/components/onboarding/steps/ExperienceStep";
import { EducationStep } from "@/components/onboarding/steps/EducationStep";
import { SkillsStep } from "@/components/onboarding/steps/SkillsStep";
import { ProjectsStep } from "@/components/onboarding/steps/ProjectsStep";
import { ContactStep } from "@/components/onboarding/steps/ContactStep";
import { ReviewStep } from "@/components/onboarding/steps/ReviewStep";
import {
  StepHeader,
  ProgressBar,
  NavigationButtons,
  StepIndicator,
} from "@/components/onboarding/Navigation";

const STEPS = [
  "Basic Info",
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Contact",
  "Review",
];

/**
 * Enhanced Onboarding Page with Live Preview
 *
 * Features:
 * - Split-screen design with form on left and live preview on right
 * - Responsive layout that stacks on mobile
 * - Real-time preview updates
 * - Uses refactored step components for maintainability
 *
 * Refactoring benefits:
 * - Reduced from 914 lines to ~140 lines
 * - Reuses all step components from page.tsx
 * - Shares same profile management hook
 * - Easy to toggle between preview and non-preview modes
 */
export default function OnboardingWithPreview() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const {
    profile,
    updateProfile,
    experience,
    education,
    skills,
    projects,
  } = useProfileForm();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // TODO: Save to Firestore
    console.log("Saving profile:", profile);
    router.push("/dashboard");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep profile={profile} onChange={updateProfile} />;

      case 1:
        return (
          <ExperienceStep
            experience={profile.experience || []}
            onAdd={experience.add}
            onUpdate={experience.update}
            onRemove={experience.remove}
          />
        );

      case 2:
        return (
          <EducationStep
            education={profile.education || []}
            onAdd={education.add}
            onUpdate={education.update}
            onRemove={education.remove}
          />
        );

      case 3:
        return (
          <SkillsStep
            skills={profile.skills || []}
            onAdd={skills.add}
            onUpdate={skills.update}
            onRemove={skills.remove}
          />
        );

      case 4:
        return (
          <ProjectsStep
            projects={profile.projects || []}
            onAdd={projects.add}
            onUpdate={projects.update}
            onRemove={projects.remove}
          />
        );

      case 5:
        return <ContactStep profile={profile} onChange={updateProfile} />;

      case 6:
        return <ReviewStep profile={profile} />;

      default:
        return null;
    }
  };

  const formContent = (
    <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 lg:p-8">
      {renderStep()}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <StepHeader
            stepNumber={currentStep}
            stepName={STEPS[currentStep]}
            totalSteps={STEPS.length}
          />

          {/* Progress Bar */}
          <div className="mt-4">
            <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} />
          </div>
        </div>

        {/* Layout - Form on left, Preview on right for larger screens */}
        <ResumePreviewPanel profile={profile}>
          {formContent}

          {/* Navigation Buttons */}
          <div className="mt-8">
            <NavigationButtons
              currentStep={currentStep}
              totalSteps={STEPS.length}
              onPrevious={handlePrev}
              onNext={handleNext}
              onComplete={handleSubmit}
            />
          </div>

          {/* Step Indicator */}
          <div className="mt-8">
            <StepIndicator
              steps={STEPS}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </div>
        </ResumePreviewPanel>
      </div>
    </div>
  );
}
