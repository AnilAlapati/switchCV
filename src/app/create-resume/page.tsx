// src/app/create-resume/page.tsx (Refactored)
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useAIResume } from "@/hooks/useAIResume";
import { useAIConversation } from "@/hooks/useAIConversation";
import { buildResumeProfile, saveResumeToDB } from "@/lib/resumeGenerator";
import { ChatMessages } from "@/components/ChatMessages";
import { ResumeReviewModal } from "@/components/ResumeReviewModal";
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
    stage,
    setStage,
    resumeData,
    setResumeData,
    aiModelUsed,
    setAiModelUsed,
    isGeneratingQuestion,
    aiConnectionStatus,
    addMessage,
    addAssistantMessageWithDelay,
    initializeAIGreeting,
    generateNextQuestion,
  } = useAIConversation();

  const [currentInput, setCurrentInput] = useState("");
  const [generatedResume, setGeneratedResume] =
    useState<EnhancedResumeContent | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const MAX_RETRIES = 5;

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
   * Handle resume generation with smart LLM feedback integration
   */
  const handleResumeGeneration = async (userFeedback?: string) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log(
        "🚀 Starting AI resume generation...",
        userFeedback ? `with feedback: ${userFeedback}` : ""
      );

      // Build the prompt with feedback context
      const feedbackContext = userFeedback
        ? `\n\nUser Feedback from Previous Iteration:\n${userFeedback}\nPlease incorporate this feedback into the new resume generation.`
        : "";

      const enhancedContent = await generateResumeContent(
        {
          personalInfo: {
            name: resumeData.personalInfo?.name || "",
            email: resumeData.personalInfo?.email || "",
            location: resumeData.personalInfo?.location || "",
          },
          summary: `Seeking ${
            resumeData.jobTarget || "new opportunities"
          }${feedbackContext}`,
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

      if (!enhancedContent) {
        throw new Error(aiError || "Failed to generate resume content");
      }

      setGeneratedResume(enhancedContent);
      setShowReviewModal(true);

      // Track which model was used
      const modelName = aiConnectionStatus?.model || "AI";
      setAiModelUsed(modelName);
      console.log(`✅ Resume generated using ${modelName}`);
    } catch (error) {
      console.error("❌ Resume generation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      addAssistantMessageWithDelay(
        `I had trouble generating your resume: ${errorMessage}. Please try again or contact support if the issue persists.`,
        1000
      );
      setStage("personal");
    }
  };

  /**
   * Handle accepting the reviewed resume
   */
  const handleAcceptResume = async () => {
    if (!generatedResume || !user) return;

    setIsReviewLoading(true);
    try {
      // Build and save resume profile
      const resumeProfile = await buildResumeProfile(
        user.uid,
        resumeData,
        generatedResume
      );

      console.log("📝 Saving resume to database...", resumeProfile);

      // Get auth token for ID mapping
      const authToken = await user.getIdToken();
      await saveResumeToDB(resumeProfile, authToken);
      console.log("✅ Resume saved successfully");

      // Use numericId for new format, fallback to slug for backward compatibility
      const shareId = resumeProfile.numericId?.toString() || resumeProfile.slug;
      const resumeUrl = `${window.location.origin}/resume/${shareId}`;

      setShowReviewModal(false);
      setStage("complete");

      // Show the URL to user - do NOT auto-redirect
      addAssistantMessageWithDelay(
        `🎉 Your resume has been saved!\n\n📋 Your Resume URL:\n${resumeUrl}\n\nYou can copy this link and share it with recruiters.`,
        1000
      );

      // Clear session storage after successful creation
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("switchcv_conversation_session");
        } catch {
          // Ignore errors clearing session
        }
      }

      console.log(`✅ Resume created successfully at: ${resumeUrl}`);
    } catch (error) {
      console.error("❌ Error accepting resume:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error saving resume: ${errorMessage}`);
    } finally {
      setIsReviewLoading(false);
    }
  };

  /**
   * Handle rewriting resume with user feedback
   */
  const handleRewriteResume = async (feedback: string) => {
    if (retryCount >= MAX_RETRIES) {
      alert("Maximum retries reached. Please accept the current resume.");
      return;
    }

    setIsReviewLoading(true);
    setRetryCount((prev) => prev + 1);

    try {
      await handleResumeGeneration(feedback);
    } finally {
      setIsReviewLoading(false);
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
        setTimeout(() => handleResumeGeneration(), 2000);
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

        <AILoadingState aiLoading={aiLoading} aiError={aiError} />

        <CreateResumeInputForm
          currentInput={currentInput}
          onInputChange={setCurrentInput}
          onSubmit={handleSubmit}
          stage={stage}
        />
      </div>

      {/* Resume Review Modal */}
      {showReviewModal && generatedResume && (
        <ResumeReviewModal
          generatedResume={generatedResume}
          aiModelUsed={aiModelUsed}
          onAccept={handleAcceptResume}
          onRewrite={handleRewriteResume}
          retryCount={retryCount}
          maxRetries={MAX_RETRIES}
          isLoading={isReviewLoading}
        />
      )}
    </div>
  );
}
