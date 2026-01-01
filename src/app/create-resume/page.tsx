/* eslint-disable max-lines */
"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { CreateResumeHeader } from "@/components/create-resume/CreateResumeHeader";
import { CreateResumeInputForm } from "@/components/create-resume/CreateResumeInputForm";
import { AILoadingState } from "@/components/create-resume/AILoadingState";
import { ResumeProgress } from "@/components/create-resume/ResumeProgress";
import { getVerificationRoute } from "@/lib/config";
import { Bot, User } from "lucide-react";

const VERIFICATION_ROUTE = getVerificationRoute();
const SESSION_KEY = "resume_creation_session";

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

  // Load session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.messages) {
          setMessages(
            parsed.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
        if (parsed.stage) setStage(parsed.stage);
        if (parsed.sessionData) setSessionData(parsed.sessionData);
        if (parsed.progress) setProgress(parsed.progress);
      } catch {
        // Failed to restore session, continue with defaults
      }
    }
  }, []);

  // Save session on change
  useEffect(() => {
    if (messages.length > 0 || stage !== "input" || progress > 0) {
      const sessionToSave = {
        messages,
        stage,
        sessionData,
        progress,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
    }
  }, [messages, stage, sessionData, progress]);

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
        router.push(VERIFICATION_ROUTE);
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
        localStorage.removeItem(SESSION_KEY);
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
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("401"))
          errorMessage = "Your session has expired. Please refresh the page.";
        else if (error.message.includes("429"))
          errorMessage =
            "You're sending messages too fast. Please wait a moment.";
        else if (error.message.includes("500"))
          errorMessage =
            "Our AI service is having a hiccup. Please try again in a minute.";
        else if (
          error.message.includes("fetch") ||
          error.message.includes("Network")
        )
          errorMessage =
            "Network error. Please check your internet connection.";
        else errorMessage = error.message;
      }
      setAiError(errorMessage);
      setStage("input");
    } finally {
      setAiLoading(false);
    }
  };

  const handleForceCreate = async () => {
    if (!user) return;

    const forceMessage = "Create my resume now";
    const userMessage: Message = {
      id: Date.now().toString(),
      content: forceMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
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
          message: forceMessage,
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

      if (data.sessionData) {
        setSessionData(data.sessionData);
      }

      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      if (data.resumeId) {
        setStage("complete");
        localStorage.removeItem(SESSION_KEY);
        setTimeout(() => {
          router.push(`/resumes/${data.resumeId}`);
        }, 2000);
      } else {
        setStage("input");
      }
    } catch (error) {
      logger.error({ err: error }, "Error generating resume:");
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("401"))
          errorMessage = "Your session has expired. Please refresh the page.";
        else if (error.message.includes("429"))
          errorMessage =
            "You're sending messages too fast. Please wait a moment.";
        else if (error.message.includes("500"))
          errorMessage =
            "Our AI service is having a hiccup. Please try again in a minute.";
        else if (
          error.message.includes("fetch") ||
          error.message.includes("Network")
        )
          errorMessage =
            "Network error. Please check your internet connection.";
        else errorMessage = error.message;
      }
      setAiError(errorMessage);
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
    <DashboardBackground>
      <CreateResumeHeader aiConnectionStatus={aiConnectionStatus} />

      {isPremiumOrHigher && availableModels.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-4 flex justify-end">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Model:</span>
            <select
              value={selectedModelId || ""}
              onChange={(e) => setSelectedModelId(e.target.value || undefined)}
              className="bg-card border border-border text-sm rounded-md px-3 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="border-primary/30 shadow-lg bg-card/80 backdrop-blur-md"
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
        <div
          className="bg-card/50 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 mb-6 min-h-[500px] max-h-[650px] overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          tabIndex={0}
          role="log"
          aria-live="polite"
          aria-label="Chat history"
        >
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center h-full">
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl shadow-lg mb-4 transform rotate-3 transition-transform hover:rotate-0 duration-300">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">
                Your Career Agent is Ready
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">
                I'm your autonomous career agent. Tell me what you're targeting,
                and I'll strategize the best way to frame your experience for
                maximum impact.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-3 ${message.isUser ? "justify-end" : "justify-start"
                    }`}
                >
                  {!message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] p-5 rounded-2xl shadow-sm ${message.isUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-white/60 backdrop-blur-sm text-foreground border border-white/40 rounded-bl-none"
                      }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <p
                      className={`text-[10px] mt-2 ${message.isUser
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                        }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                  )}
                </div>
              ))}
              <AILoadingState aiLoading={aiLoading} aiError={aiError} />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {progress >= 60 && stage !== "complete" && !aiLoading && (
          <div className="flex justify-center mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={handleForceCreate}
              aria-label="Create resume now"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full shadow-lg font-semibold flex items-center gap-2 transition-all hover:scale-105 text-sm border border-emerald-500/50"
            >
              <span>✨ Create Resume Now</span>
            </button>
          </div>
        )}

        <CreateResumeInputForm
          currentInput={currentInput}
          onInputChange={setCurrentInput}
          onSubmit={handleSubmit}
          stage={stage}
        />
      </div>
    </DashboardBackground>
  );
}
