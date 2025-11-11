// src/app/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ResumeProfile } from "@/types";

const steps = [
  "Basic Info",
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Contact",
  "Review",
];

export default function Onboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<ResumeProfile>>({
    title: "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    contact: {
      email: { value: "", visibility: "masked" },
      phone: { value: "", visibility: "masked" },
    },
    projects: [],
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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

  const updateProfile = (updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Resume Title
              </label>
              <input
                type="text"
                value={profile.title || ""}
                onChange={(e) => updateProfile({ title: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                placeholder="e.g., Software Engineer Resume"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Professional Summary
              </label>
              <textarea
                value={profile.summary || ""}
                onChange={(e) => updateProfile({ summary: e.target.value })}
                rows={4}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                placeholder="Brief summary of your professional background..."
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Work Experience</h3>
            <p className="text-sm text-gray-600">
              Add your most recent work experience
            </p>
            {/* TODO: Add experience form */}
            <div className="text-center text-gray-500">
              Experience form coming soon...
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Education</h3>
            <p className="text-sm text-gray-600">
              Add your educational background
            </p>
            <div className="text-center text-gray-500">
              Education form coming soon...
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Skills</h3>
            <p className="text-sm text-gray-600">
              List your technical and soft skills
            </p>
            <div className="text-center text-gray-500">
              Skills form coming soon...
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Projects</h3>
            <p className="text-sm text-gray-600">
              Showcase your notable projects
            </p>
            <div className="text-center text-gray-500">
              Projects form coming soon...
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={profile.contact?.email?.value || ""}
                onChange={(e) =>
                  updateProfile({
                    contact: {
                      ...profile.contact!,
                      email: {
                        ...profile.contact!.email,
                        value: e.target.value,
                      },
                    },
                  })
                }
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                value={profile.contact?.phone?.value || ""}
                onChange={(e) =>
                  updateProfile({
                    contact: {
                      ...profile.contact!,
                      phone: {
                        ...profile.contact!.phone,
                        value: e.target.value,
                      },
                    },
                  })
                }
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review Your Information</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-sm">{JSON.stringify(profile, null, 2)}</pre>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Resume
          </h1>
          <p className="text-gray-600">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">{renderStep()}</div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Complete Setup
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
