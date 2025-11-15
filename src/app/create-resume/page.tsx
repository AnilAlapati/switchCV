// src/app/create-resume/page.tsx (Refactored)
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useAIResume } from "@/hooks/useAIResume";
import { useAIConversation } from "@/hooks/useAIConversation";
import { buildResumeProfile, saveResumeToDB } from "@/lib/resumeGenerator";
import { ChatMessages } from "@/components/ChatMessages";
import { GeneratedResumePreview } from "@/components/GeneratedResumePreview";
import { CreateResumeHeader } from "@/components/create-resume/CreateResumeHeader";
import { AILoadingState } from "@/components/create-resume/AILoadingState";
import { CreateResumeInputForm } from "@/components/create-resume/CreateResumeInputForm";
import type { EnhancedResumeContent } from "@/lib/resumeGenerator";

export default function CreateResume() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const {
    generateResumeContent,
    loading: aiLoading,
    error: aiError,
  } = useAIResume();

  // Use custom hook for AI conversation state management
  const {
    messages,
    setMessages,
    stage,
    setStage,
    resumeData,
    setResumeData,
    aiModelUsed,
    setAiModelUsed,
    isGeneratingQuestion,
    aiConnectionStatus,
    setAiConnectionStatus,
    initializedRef,
    addMessage,
    addAssistantMessageWithDelay,
    initializeAIGreeting,
    generateNextQuestion,
  } = useAIConversation();

  const [currentInput, setCurrentInput] = useState("");
  const [generatedResume, setGeneratedResume] =
    useState<EnhancedResumeContent | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Initialize AI greeting when component mounts
  useEffect(() => {
    if (user && !loading) {
      initializeAIGreeting();
    }
  }, [user, loading]);

  /**
   * Handle the complete resume generation flow
   * including saving to database and redirecting
   */
  const handleResumeGeneration = async () => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("🚀 Starting AI resume generation...");
      const enhancedContent = await generateResumeContent(
        {
          personalInfo: {
            name: resumeData.personalInfo?.name || "",
            email: resumeData.personalInfo?.email || "",
            location: resumeData.personalInfo?.location || "",
          },
          summary: `Seeking ${resumeData.jobTarget || "new opportunities"}`,
          experience: [
            {
              title: "Professional Experience",
              company: "Previous Company",
              duration: "Recent",
              description: resumeData.experience || "",
              achievements: [],
            },
          ],
          education: [
            {
              degree: resumeData.education || "",
              institution: "",
              year: "",
            },
          ],
          skills: resumeData.skills
            ? resumeData.skills.split(",").map((s) => s.trim())
            : [],
        },
        "modern",
        "professional"
      );

      if (enhancedContent) {
        setGeneratedResume(enhancedContent);

        // Track which model was used
        const modelName = aiConnectionStatus?.model || "AI";
        setAiModelUsed(modelName);
        console.log(`✅ Resume generated using ${modelName}`);

        // Build and save resume profile (buildResumeProfile is now async)
        const resumeProfile = await buildResumeProfile(
          user.uid,
          resumeData,
          enhancedContent
        );
        const numericId = resumeProfile.numericId || resumeProfile.slug;

        await saveResumeToDB(resumeProfile);

        setStage("complete");
        addAssistantMessageWithDelay(
          `🎉 Your resume is ready! You can share it at: ${window.location.origin}/resumes/${numericId}`,
          1000
        );

        // Redirect to the shareable resume page after a delay
        setTimeout(() => {
          router.push(`/resumes/${numericId}`);
        }, 3000);
      } else {
        throw new Error(aiError || "Failed to generate resume content");
      }
    } catch (error) {
      console.error("Resume generation error:", error);
      addAssistantMessageWithDelay(
        `I had trouble generating your resume: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        1000
      );
      setStage("personal"); // Reset to allow retry
    }
  };

  /**
   * Handle form submission for each conversation stage
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    // Add user message
    addMessage(currentInput, "user");
    const userResponse = currentInput;
    setCurrentInput("");

    // Process based on current stage
    switch (stage) {
      case "job_target":
        setResumeData((prev) => ({ ...prev, jobTarget: userResponse }));
        setStage("experience");

        const experienceQuestion = await generateNextQuestion("experience", {
          ...resumeData,
          jobTarget: userResponse,
        });
        addAssistantMessageWithDelay(experienceQuestion);
        break;

      case "experience":
        setResumeData((prev) => ({ ...prev, experience: userResponse }));
        setStage("skills");

        const skillsQuestion = await generateNextQuestion("skills", {
          ...resumeData,
          experience: userResponse,
        });
        addAssistantMessageWithDelay(skillsQuestion);
        break;

      case "skills":
        setResumeData((prev) => ({ ...prev, skills: userResponse }));
        setStage("education");

        const educationQuestion = await generateNextQuestion("education", {
          ...resumeData,
          skills: userResponse,
        });
        addAssistantMessageWithDelay(educationQuestion);
        break;

      case "education":
        setResumeData((prev) => ({ ...prev, education: userResponse }));
        setStage("personal");

        const personalQuestion = await generateNextQuestion("personal", {
          ...resumeData,
          education: userResponse,
        });
        addAssistantMessageWithDelay(personalQuestion);
        break;

      case "personal":
        // Parse personal info
        const parts = userResponse.split(",").map((p) => p.trim());
        const personalInfo = {
          name: parts[0] || "",
          email: parts[1] || "",
          location: parts[2] || "",
        };
        setResumeData((prev) => ({
          ...prev,
          personalInfo,
        }));
        setStage("generating");

        addAssistantMessageWithDelay(
          "Thanks! Now I'm using AI to create a professional resume tailored to your target role. This will take just a moment..."
        );

        // Generate resume after delay
        setTimeout(handleResumeGeneration, 2000);
        break;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <CreateResumeHeader aiConnectionStatus={aiConnectionStatus} />

        <ChatMessages
          messages={messages}
          isGeneratingQuestion={isGeneratingQuestion}
        />

        <div className="p-4">
          <GeneratedResumePreview
            generatedResume={generatedResume}
            aiModelUsed={aiModelUsed}
          />
        </div>

        <AILoadingState aiLoading={aiLoading} aiError={aiError} />

        <CreateResumeInputForm
          currentInput={currentInput}
          onInputChange={setCurrentInput}
          onSubmit={handleSubmit}
          stage={stage}
        />
      </div>
    </div>
  );
}
