"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useProfileForm } from "@/hooks/useProfileForm";
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
 * Refactored Onboarding Page
 *
 * Benefits of refactoring:
 * - Split into 7 focused step components
 * - Extracted profile management to useProfileForm hook
 * - Extracted navigation UI components
 * - Extracted reusable form components
 * - Reduced main component from 896 to ~130 lines
 * - Each step component is independently testable
 * - Much easier to maintain and modify individual steps
 */
export default function Onboarding() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const { profile, updateProfile, experience, education, skills, projects } =
    useProfileForm();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/sign-in");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Checking your account…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Redirecting to sign in…</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
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

        {/* Form Container */}
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 lg:p-8">
          {renderStep()}
        </div>

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
      </div>
    </div>
  );
}
