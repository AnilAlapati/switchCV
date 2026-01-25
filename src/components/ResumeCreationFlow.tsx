"use client";

import { logger } from "@/lib/logger";
import { toast } from "sonner";

import React, { useState, useCallback } from "react";
import { ResumeQAForm } from "./ResumeQAForm";
import { ResumeGenerationLoader } from "./ResumeGenerationLoader";
import { ResumeReviewModal } from "./ResumeReviewModal";
import { useAIResume, type ResumeData } from "@/hooks/useAIResume";
import { Resume } from "@/lib/resumeComparison.types";
import type { EnhancedExperience } from "@/types/aiResume.types";

type FlowPhase = "questions" | "generating" | "review" | "saving";

interface ResumeCreationFlowProps {
  userId: string;
  onComplete?: (resumeId: string) => void;
}

/**
 * Orchestrates the complete resume creation flow
 */
export const ResumeCreationFlow: React.FC<ResumeCreationFlowProps> = ({
  userId,
  onComplete,
}) => {
  const [phase, setPhase] = useState<FlowPhase>("questions");
  const [generatedResume, setGeneratedResume] = useState<Resume | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [generationMessage, setGenerationMessage] = useState(
    "Generating your professional resume with AI...",
  );
  const [preferences, setPreferences] = useState<{
    template: string;
    tone: string;
    mode: string;
  }>({
    template: "modern",
    tone: "professional",
    mode: "standard",
  });

  const { generateResumeContent, loading: isGenerating } = useAIResume();

  const handleQAComplete = useCallback(
    async (answers: Record<string, string | string[]>) => {
      setPhase("generating");
      setGenerationMessage("Generating your professional resume with AI...");
      setRetryCount(0);

      try {
        // Convert form answers to ResumeData structure
        const resumeData: ResumeData = {
          personalInfo: {
            name: String(answers.personal_name ?? "Professional"),
            email: String(answers.personal_email ?? ""),
            phone: answers.personal_phone
              ? String(answers.personal_phone)
              : undefined,
            location: answers.personal_location
              ? String(answers.personal_location)
              : undefined,
            linkedin: answers.personal_linkedin
              ? String(answers.personal_linkedin)
              : undefined,
            github: answers.personal_github
              ? String(answers.personal_github)
              : undefined,
          },
          summary: String(answers.summary ?? ""),
          experience: [],
          education: [],
          skills: Array.isArray(answers.skills)
            ? answers.skills
            : typeof answers.skills === "string"
              ? answers.skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
        };

        // Extract experience entries
        const expCountStr = answers.experience_count as string;
        const expCount = parseInt(expCountStr?.replace("+", "") || "0", 10);
        for (let i = 1; i <= Math.min(expCount, 5); i++) {
          const title = answers[`experience_${i}_title`] as string;
          const company = answers[`experience_${i}_company`] as string;
          const duration = answers[`experience_${i}_duration`] as string;
          const description = answers[`experience_${i}_description`] as string;

          if (title && company) {
            resumeData.experience.push({
              title,
              company,
              duration,
              description,
              achievements: [],
            });
          }
        }

        // Extract education entries
        const eduCountStr = answers.education_count as string;
        const eduCount = parseInt(eduCountStr || "0", 10);
        for (let i = 1; i <= Math.min(eduCount, 3); i++) {
          const degree = answers[`education_${i}_degree`] as string;
          const institution = answers[`education_${i}_institution`] as string;
          const year = answers[`education_${i}_year`] as string;

          if (degree && institution) {
            resumeData.education.push({
              degree,
              institution,
              year,
            });
          }
        }

        const selectedTemplate =
          typeof answers.preferences_template === "string"
            ? answers.preferences_template
            : "modern";
        const selectedTone =
          typeof answers.preferences_tone === "string"
            ? answers.preferences_tone
            : "professional";

        const modeSelection =
          typeof answers.preferences_mode === "string"
            ? answers.preferences_mode
            : "Standard (Fast, 2-Agent)";

        const selectedMode = modeSelection.includes("Autonomous")
          ? "autonomous"
          : "standard";

        setPreferences({
          template: selectedTemplate,
          tone: selectedTone,
          mode: selectedMode,
        });

        // Call AI to enhance resume
        const result = await generateResumeContent(
          resumeData,
          selectedTemplate,
          selectedTone as "creative" | "professional" | "concise",
          undefined, // modelId (auto)
          selectedMode as "standard" | "autonomous",
        );

        if (!result) {
          throw new Error("Failed to generate resume content");
        }

        // Create Resume object
        const candidateName =
          typeof answers.personal_name === "string" && answers.personal_name
            ? answers.personal_name
            : "Professional";

        const resume: Resume = {
          id: `resume_${Date.now()}`,
          title: candidateName + "'s Resume",
          summary: result.enhancedSummary,
          skills: [...resumeData.skills, ...result.skillSuggestions],
          experience: result.enhancedExperience.map(
            (exp: EnhancedExperience) => ({
              company: exp.company,
              role: exp.title,
              duration: exp.duration,
              description: exp.enhancedDescription,
            }),
          ),
          education: [],
          contact: {
            email: { value: resumeData.personalInfo.email },
            phone: resumeData.personalInfo.phone
              ? { value: resumeData.personalInfo.phone }
              : undefined,
          },
        };

        setGeneratedResume(resume);
        setPhase("review");
      } catch (error) {
        logger.error({ err: error }, "Resume generation failed:");
        setGenerationMessage("Error generating resume. Please try again.");
        setTimeout(() => {
          setPhase("questions");
        }, 2000);
      }
    },
    [generateResumeContent],
  );

  const handleAcceptResume = useCallback(async () => {
    if (!generatedResume) return;

    setPhase("saving");
    setGenerationMessage("💾 Saving to your profile...");

    try {
      const response = await fetch("/api/resumes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          resume: generatedResume,
          isPublic: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save resume");
      }

      const data = await response.json();
      if (!data.resumeId) {
        throw new Error("Invalid response: missing resume ID");
      }
      setGenerationMessage("✅ Resume created successfully!");

      setTimeout(() => {
        onComplete?.(data.resumeId);
      }, 1500);
    } catch (error) {
      logger.error({ err: error }, "Resume save failed:");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save resume. Please try again.",
      );
      setPhase("review");
    }
  }, [generatedResume, userId, onComplete]);

  const handleRewriteResume = useCallback(
    async (feedback: string) => {
      // TODO: Use feedback for AI-guided regeneration in the future
      void feedback; // Mark as intentionally unused for now

      if (!generatedResume) return;

      if (retryCount >= 5) {
        toast.warning("Maximum rewrites reached. Please accept this version.");
        return;
      }

      setPhase("generating");
      setGenerationMessage(`Regenerating resume... (${retryCount + 1}/5)`);
      setRetryCount(retryCount + 1);

      try {
        // Regenerate with same data
        const currentTitle = generatedResume.title;
        const nameFromTitle = currentTitle.replace("'s Resume", "");

        const resumeData: ResumeData = {
          personalInfo: {
            name: nameFromTitle,
            email: generatedResume.contact.email.value,
            phone: generatedResume.contact.phone?.value,
          },
          summary: generatedResume.summary || "",
          experience: generatedResume.experience.map((exp) => ({
            title: exp.role,
            company: exp.company,
            duration: exp.duration,
            description: exp.description,
            achievements: exp.achievements || [],
          })),
          education: (generatedResume.education || []).map((edu) => ({
            degree: edu.degree,
            institution: edu.institution,
            year: String(edu.year),
          })),
          skills: generatedResume.skills,
        };
        const result = await generateResumeContent(
          resumeData,
          preferences.template,
          preferences.tone as "creative" | "professional" | "concise",
          undefined,
          preferences.mode as "standard" | "autonomous",
        );

        if (!result) {
          throw new Error("Failed to regenerate resume");
        }

        const newSkills = [...resumeData.skills, ...result.skillSuggestions];
        const newId = `resume_${Date.now()}`;

        const updatedResume: Resume = {
          id: newId,
          title: generatedResume.title,
          summary: result.enhancedSummary,
          skills: newSkills,
          experience: result.enhancedExperience.map(
            (exp: EnhancedExperience) => ({
              company: exp.company,
              role: exp.title,
              duration: exp.duration,
              description: exp.enhancedDescription,
            }),
          ),
          education: [],
          contact: generatedResume.contact,
        };

        setGeneratedResume(updatedResume);
        setPhase("review");
      } catch (error) {
        logger.error({ err: error }, "Resume regeneration failed:");
        setPhase("review");
        toast.error("Failed to regenerate resume. Please try again.");
      }
    },
    [
      retryCount,
      generatedResume,
      generateResumeContent,
      preferences.template,
      preferences.tone,
      preferences.mode,
    ],
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {phase === "questions" && (
        <ResumeQAForm
          onComplete={handleQAComplete}
          onCancel={() => setPhase("questions")}
        />
      )}

      {(phase === "generating" || phase === "saving") && (
        <ResumeGenerationLoader
          status={
            phase === "saving"
              ? "saving"
              : isGenerating
                ? "generating"
                : "complete"
          }
          message={generationMessage}
        />
      )}

      {phase === "review" && generatedResume && (
        <ResumeReviewModal
          resume={generatedResume}
          isOpen={true}
          onAccept={handleAcceptResume}
          onRewrite={handleRewriteResume}
          isLoading={isGenerating}
          retryCount={retryCount}
          maxRetries={5}
        />
      )}
    </div>
  );
};
