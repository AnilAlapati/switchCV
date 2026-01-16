"use client";

import { logger } from "@/lib/logger";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProfileForm } from "@/hooks/useProfileForm";
import {
  mergeProfileIntoResume,
  normalizeResumeForEditor,
  type ResumeEditorMeta,
} from "@/lib/utils/resumeEditor";
import type { ResumeProfile } from "@/types";
import {
  ResumeEditWizard,
  type SaveState,
} from "@/components/resume/ResumeEditWizard";
import { getVerificationRoute } from "@/lib/config";

const VERIFICATION_ROUTE = getVerificationRoute();

const STEPS = [
  "Basic Info",
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Contact",
  "Review",
];

type FetchState = "idle" | "loading" | "error" | "loaded";

export default function EditResumePage() {
  const params = useParams();
  const resumeIdParam = params?.id;
  const resumeId = Array.isArray(resumeIdParam)
    ? resumeIdParam[0]
    : resumeIdParam;
  const searchParams = useSearchParams();
  const mode = searchParams?.get("mode") ?? "ai";
  const { tier, loading: tierLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!tierLoading && tier === "basic") {
      router.replace("/dashboard");
    }
  }, [tier, tierLoading, router]);

  if (!resumeId || tierLoading || tier === "basic") {
    return null;
  }

  if (mode !== "manual") {
    return <ResumeEditRedirect resumeId={resumeId} />;
  }

  return <ManualResumeEditor resumeId={resumeId} />;
}

function ResumeEditRedirect({ resumeId }: { resumeId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/resumes/${resumeId}/ai-edit`);
  }, [resumeId, router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-semibold">Opening AI Resume Editor...</h2>
        <p className="text-sm text-gray-300">
          The new AI-powered editor handles resume updates through a guided
          chat.
        </p>
        <Link
          href={`/resumes/${resumeId}/edit?mode=manual`}
          className="inline-flex items-center justify-center px-4 py-2 bg-gray-700 rounded-md border border-gray-600 hover:bg-gray-600"
        >
          Use Manual Editor Instead
        </Link>
      </div>
    </div>
  );
}

function ManualResumeEditor({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const { user, loading: authLoading, needsEmailVerification } = useAuth();
  const { profile, updateProfile, experience, education, skills, projects } =
    useProfileForm();

  const [currentStep, setCurrentStep] = useState(0);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [baseResume, setBaseResume] = useState<Record<string, any> | null>(
    null
  );
  const [meta, setMeta] = useState<ResumeEditorMeta | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || needsEmailVerification)) {
      router.replace(VERIFICATION_ROUTE);
    }
  }, [authLoading, needsEmailVerification, router, user]);

  useEffect(() => {
    const loadResume = async () => {
      if (!user || !resumeId) return;
      setFetchState("loading");
      setFetchError(null);

      try {
        const headers: HeadersInit = {};
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`/api/resumes/${resumeId}`, { headers });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || "Failed to load resume");
        }

        const resumeData = await response.json();
        const normalized = normalizeResumeForEditor(resumeData);

        setBaseResume(normalized.resume);
        setMeta(normalized.meta);
        updateProfile(normalized.profile);
        setIsDirty(false);
        setFetchState("loaded");
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch resume:");
        setFetchState("error");
        setFetchError(
          error instanceof Error ? error.message : "Failed to load resume"
        );
      }
    };

    if (!authLoading && user && !needsEmailVerification && resumeId) {
      loadResume();
    }
  }, [authLoading, needsEmailVerification, resumeId, updateProfile, user]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty((prev) => (prev ? prev : true));
  }, []);

  const handleProfileChange = useCallback(
    (updates: Partial<ResumeProfile>) => {
      markDirty();
      updateProfile(updates);
    },
    [markDirty, updateProfile]
  );

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !resumeId || !baseResume) {
      setSaveError("Resume payload not ready yet.");
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    setSaveError(null);

    try {
      const token = await user.getIdToken();
      const merged = mergeProfileIntoResume(baseResume, profile);

      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resume: merged }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to update resume");
      }

      const responseData = await response.json();
      const normalized = normalizeResumeForEditor(responseData.resume);

      setBaseResume(normalized.resume);
      setMeta(normalized.meta);
      updateProfile(normalized.profile);
      setIsDirty(false);
      setSaveState("success");
    } catch (error) {
      logger.error({ err: error }, "Failed to save resume:");
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save");
    }
  }, [baseResume, profile, resumeId, updateProfile, user]);

  if (authLoading || fetchState === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading resume editor...
      </div>
    );
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  if (fetchState === "error") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">Unable to load resume</h2>
          <p className="text-sm text-gray-300">{fetchError}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-indigo-600 rounded-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <ResumeEditWizard
        profile={profile}
        steps={STEPS}
        currentStep={currentStep}
        meta={meta}
        saveState={saveState}
        saveError={saveError}
        isDirty={isDirty}
        onProfileChange={handleProfileChange}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onStepChange={handleStepChange}
        onSave={handleSave}
        onDirty={markDirty}
        experience={experience}
        education={education}
        skills={skills}
        projects={projects}
      />
    </div>
  );
}
