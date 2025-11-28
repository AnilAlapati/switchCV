"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { CreateResumeHeader } from "@/components/create-resume/CreateResumeHeader";
import { CreateResumeInputForm } from "@/components/create-resume/CreateResumeInputForm";
import { AILoadingState } from "@/components/create-resume/AILoadingState";
import { ResumeProgress } from "@/components/create-resume/ResumeProgress";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function CreateResume() {
  const { user, loading: authLoading, needsEmailVerification } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();
  const { isPremiumOrHigher } = useTier();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [stage, setStage] = useState<"input" | "generating" | "complete">(
    "input"
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiConnectionStatus, setAiConnectionStatus] = useState<{
    connected: boolean;
    model?: string;
  } | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [availableModels, setAvailableModels] = useState<
    Array<{
      id: string;
      name: string;
      provider: string;
      tier: string;
      quality: number;
      costPer1MTokens: number;
    }>
  >([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loading = authLoading || profileLoading;

  const scrollToBottom = () => {
    // Guard against environments (like some test runners) where
    // `scrollIntoView` may not be implemented on the DOM node.
    const el = messagesEndRef.current as HTMLElement | null;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!loading) {
      if (!user || needsEmailVerification) {
        router.push("/auth?mode=verify-email");
      } else if (!role) {
        router.push("/select-role");
      } else if (role !== "jobseeker") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, needsEmailVerification, role, router]);

  useEffect(() => {
    // Check AI connection status
    const checkAIStatus = async () => {
      try {
        const response = await fetch("/api/ai/status");
        if (response.ok) {
          const data = await response.json();
          setAiConnectionStatus(data);
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to check AI status:");
        setAiConnectionStatus({ connected: false });
      }
    };
    checkAIStatus();
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      if (!isPremiumOrHigher) return;
      try {
        const response = await fetch("/api/ai/models");
        if (!response.ok) return;
        const data = await response.json();
        setAvailableModels(data.models || []);
      } catch (error) {
        logger.error({ err: error }, "Failed to load AI models");
      }
    };

    loadModels();
  }, [isPremiumOrHigher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setAiLoading(true);
    setAiError(null);
    setStage("generating");

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/resume/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: currentInput,
          conversationHistory: messages,
          sessionData,
          modelId: selectedModelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate resume: ${response.statusText}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "Resume generated successfully!",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update session data and progress
      if (data.sessionData) {
        setSessionData(data.sessionData);
      }

      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      if (data.resumeId) {
        setStage("complete");
        // Show success message and redirect after a moment
        setTimeout(() => {
          // Redirect to singular `/resumes/:id` route (legacy/test expectation)
          router.push(`/resumes/${data.resumeId}`);
        }, 2000);
      } else {
        // Continue conversation - reset to input stage
        setStage("input");
      }
    } catch (error) {
      logger.error({ err: error }, "Error generating resume:");
      setAiError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setStage("input");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  const resumeProgressProps = {
    progress,
    collectedFields: sessionData?.progress?.collectedFields,
    missingFields: sessionData?.progress?.missingFields,
  };

  const shouldShowProgress = progress > 0;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      <CreateResumeHeader aiConnectionStatus={aiConnectionStatus} />

      {isPremiumOrHigher && availableModels.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-4 flex justify-end">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="text-gray-400">Model:</span>
            <select
              value={selectedModelId || ""}
              onChange={(e) => setSelectedModelId(e.target.value || undefined)}
              className="bg-gray-800 border border-gray-700 text-sm rounded-md px-3 py-1 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Auto (recommended)</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.provider} · ${model.costPer1MTokens}/1M
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {shouldShowProgress && (
        <div className="hidden lg:flex fixed top-28 right-10 z-20 justify-end pointer-events-none">
          <div className="pointer-events-auto">
            <ResumeProgress
              {...resumeProgressProps}
              className="border-cyan-500/30 shadow-[0_25px_80px_rgba(6,182,212,0.35)]"
            />
          </div>
        </div>
      )}

      {shouldShowProgress && (
        <div className="lg:hidden mx-auto mt-4 w-full max-w-4xl px-4">
          <ResumeProgress {...resumeProgressProps} />
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Messages/Chat History */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 mb-4 min-h-[400px] max-h-[600px] overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xl font-semibold mb-3 text-white">
                Let's Build Your Perfect Resume
              </p>
              <p className="text-gray-400 max-w-md mx-auto">
                Tell me about your experience, skills, education, or what kind
                of job you're targeting. I'll help you create a professional
                resume.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl shadow-lg ${
                      message.isUser
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                        : "bg-gray-700/80 backdrop-blur-sm text-gray-100 border border-gray-600/50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
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
