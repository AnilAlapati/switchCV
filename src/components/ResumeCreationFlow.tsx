"use client";

import React, { useState, useCallback } from "react";
import { ResumeQAForm } from "./ResumeQAForm";
import { ResumeGenerationLoader } from "./ResumeGenerationLoader";
import { ResumeReviewModal } from "./ResumeReviewModal";
import { useAIResume } from "@/hooks/useAIResume";
import { Resume } from "@/lib/resumeComparison.types";

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
    "Generating your professional resume with AI..."
  );

  const { generateResumeContent, loading: isGenerating } = useAIResume();

  const handleQAComplete = useCallback(
    async (answers: Record<string, string | string[]>) => {
      setPhase("generating");
      setGenerationMessage("Generating your professional resume with AI...");
      setRetryCount(0);

      try {
        // Convert form answers to ResumeData structure
        const resumeData = {
          personalInfo: {
            name:
              typeof answers.name === "string"
                ? answers.name
                : String(answers.name || "Professional"),
            email:
              typeof answers.email === "string"
                ? answers.email
                : String(answers.email || ""),
            phone:
              typeof answers.phone === "string" ? answers.phone : undefined,
            location:
              typeof answers.location === "string"
                ? answers.location
                : undefined,
            linkedin:
              typeof answers.linkedin === "string"
                ? answers.linkedin
                : undefined,
            github:
              typeof answers.github === "string" ? answers.github : undefined,
          },
          summary:
            typeof answers.summary === "string"
              ? answers.summary
              : String(answers.summary || ""),
          experience: [],
          education: [],
          skills: Array.isArray(answers.skills)
            ? answers.skills
            : typeof answers.skills === "string"
            ? answers.skills.split(",").map((s: string) => s.trim())
            : [],
        };

        // Call AI to enhance resume
        const result = await generateResumeContent(
          resumeData,
          "modern",
          "professional"
        );

        if (!result) {
          throw new Error("Failed to generate resume content");
        }

        // Create Resume object
        const candidateName =
          typeof answers.name === "string" && answers.name
            ? answers.name
            : "Professional";

        const resume: Resume = {
          id: `resume_${Date.now()}`,
          title: candidateName + "'s Resume",
          summary: result.enhancedSummary,
          skills: [...resumeData.skills, ...result.skillSuggestions],
          experience: result.enhancedExperience.map((exp: any) => ({
            company: exp.company,
            role: exp.title,
            duration: exp.duration,
            description: exp.enhancedDescription,
          })),
          education: [],
        };

        setGeneratedResume(resume);
        setPhase("review");
      } catch (error) {
        console.error("Resume generation failed:", error);
        setGenerationMessage("Error generating resume. Please try again.");
        setTimeout(() => {
          setPhase("questions");
        }, 2000);
      }
    },
    [generateResumeContent]
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
      setGenerationMessage("✅ Resume created successfully!");

      setTimeout(() => {
        onComplete?.(data.resumeId);
      }, 1500);
    } catch (error) {
      console.error("Resume save failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save resume.");
      setPhase("review");
    }
  }, [generatedResume, userId, onComplete]);

  const handleRewriteResume = useCallback(
    async (feedback: string) => {
      // TODO: Use feedback for AI-guided regeneration in the future
      void feedback; // Mark as intentionally unused for now

      if (!generatedResume) return;

      if (retryCount >= 5) {
        alert("Maximum rewrites reached. Please accept this version.");
        return;
      }

      setPhase("generating");
      setGenerationMessage(`Regenerating resume... (${retryCount + 1}/5)`);
      setRetryCount(retryCount + 1);

      try {
        // Regenerate with same data
        const currentTitle = generatedResume.title;
        const nameFromTitle = currentTitle.replace("'s Resume", "");

        const resumeData = {
          personalInfo: {
            name: nameFromTitle,
            email: "",
          },
          summary: generatedResume.summary || "",
          experience: [],
          education: [],
          skills: generatedResume.skills,
        };
        const result = await generateResumeContent(
          resumeData,
          "modern",
          "professional"
        );

        if (!result) {
          throw new Error("Failed to regenerate resume");
        }

        const updatedResume: Resume = {
          id: `resume_${Date.now()}`,
          title: generatedResume.title,
          summary: result.enhancedSummary,
          skills: [...resumeData.skills, ...result.skillSuggestions],
          experience: result.enhancedExperience.map((exp: any) => ({
            company: exp.company,
            role: exp.title,
            duration: exp.duration,
            description: exp.enhancedDescription,
          })),
          education: [],
        };

        setGeneratedResume(updatedResume);
        setPhase("review");
      } catch (error) {
        console.error("Resume regeneration failed:", error);
        setPhase("review");
        alert("Failed to regenerate resume. Please try again.");
      }
    },
    [retryCount, generatedResume, generateResumeContent]
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
