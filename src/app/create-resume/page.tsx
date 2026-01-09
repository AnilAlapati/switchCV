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
import { CreateResumeWelcome } from "@/components/create-resume/CreateResumeWelcome";
import { AILoadingState } from "@/components/create-resume/AILoadingState";
import { ResumeProgress } from "@/components/create-resume/ResumeProgress";
import { SessionRestoreDialog } from "@/components/create-resume/SessionRestoreDialog";
import { getVerificationRoute } from "@/lib/config";
import { Bot, User } from "lucide-react";

const VERIFICATION_ROUTE = getVerificationRoute();

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface SessionData {
  userId: string;
  messages: Message[];
  stage: "input" | "generating" | "complete";
  sessionData: any;
  progress: number;
  lastActivity?: string;
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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingSession, setPendingSession] = useState<SessionData | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);

  const loading = authLoading || profileLoading;

  // Load session on mount - show dialog if session exists
  useEffect(() => {
    if (!user?.uid) return;

    // Clean up old non-user-specific session (one-time migration)
    const OLD_SESSION_KEY = "resume_creation_session";
    if (localStorage.getItem(OLD_SESSION_KEY)) {
      logger.warn("🧹 Cleaning up old non-user-specific session data");
      localStorage.removeItem(OLD_SESSION_KEY);
    }

    const SESSION_KEY = `resume_creation_session_${user.uid}`;
    const savedSession = localStorage.getItem(SESSION_KEY);

    if (savedSession) {
      try {
        const parsed: SessionData = JSON.parse(savedSession);

        // CRITICAL: Verify session belongs to current user
        if (parsed.userId !== user.uid) {
          logger.warn(
            { sessionUserId: parsed.userId, currentUserId: user.uid },
            "🚨 SECURITY: Session mismatch detected, clearing old session"
          );
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        // Show dialog instead of auto-restoring
        if (parsed.messages && parsed.messages.length > 0) {
          setPendingSession(parsed);
          setShowRestoreDialog(true);
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to restore session");
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, [user?.uid]);

  const handleContinueSession = () => {
    if (!pendingSession) return;

    // Restore the session
    setMessages(
      pendingSession.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    );
    if (pendingSession.stage) setStage(pendingSession.stage);
    if (pendingSession.sessionData) setSessionData(pendingSession.sessionData);
    if (pendingSession.progress) setProgress(pendingSession.progress);

    setShowRestoreDialog(false);
    setPendingSession(null);
    logger.info("✅ Session restored from previous conversation");
  };

  const handleStartFresh = () => {
    if (!user?.uid) return;

    const SESSION_KEY = `resume_creation_session_${user.uid}`;
    localStorage.removeItem(SESSION_KEY);

    // Reset all state to fresh
    setMessages([]);
    setStage("input");
    setProgress(0);
    setSessionData(null);
    setShowRestoreDialog(false);
    setPendingSession(null);

    logger.info("🆕 Started fresh resume creation");
  };

  // Save session on change - with userId validation
  useEffect(() => {
    if (!user?.uid) return;

    if (messages.length > 0 || stage !== "input" || progress > 0) {
      const SESSION_KEY = `resume_creation_session_${user.uid}`;
      const sessionToSave: SessionData = {
        userId: user.uid, // CRITICAL: Include userId for validation
        messages,
        stage,
        sessionData,
        progress,
        lastActivity: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
    }
  }, [messages, stage, sessionData, progress, user?.uid]);

  const scrollToBottom = () => {
    // Guard against environments (like some test runners) where
    // `scrollIntoView` may not be implemented on the DOM node.
    const el = messagesEndRef.current as HTMLElement | null;
    if (el && typeof el.scrollIntoView === "function") {
      // Always use instant scroll to prevent jarring movement
      el.scrollIntoView({ behavior: "auto", block: "end" });
    }
  };

  useEffect(() => {
    // Avoid jumping the page when the very first AI flow is started from the welcome CTA
    if (messages.length === 0) {
      previousMessageCount.current = 0;
      return;
    }

    // Scroll immediately when new messages arrive
    if (previousMessageCount.current > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => scrollToBottom());
    }

    previousMessageCount.current = messages.length;
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

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const input = overrideInput || currentInput;
    if (!input.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
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
          message: input,
          conversationHistory: messages,
          sessionData,
          modelId: selectedModelId,
        }),
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        const errorStatus = response.status;
        try {
          const errorData = await response.json();
          if (errorData.error) errorDetail = errorData.error;
          if (errorData.details)
            errorDetail = `${errorDetail}: ${errorData.details}`;
        } catch {
          // Ignore if not JSON
        }

        // If 401, try to force refresh token once
        if (errorStatus === 401) {
          logger.warn("Got 401, attempting token refresh...");
          try {
            const freshToken = await user.getIdToken(true); // force refresh
            const retryResponse = await fetch("/api/resume/generate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${freshToken}`,
              },
              body: JSON.stringify({
                message: input,
                conversationHistory: messages,
                sessionData,
                modelId: selectedModelId,
              }),
            });

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: data.response || "Resume generated successfully!",
                isUser: false,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, aiMessage]);
              if (data.sessionData) setSessionData(data.sessionData);
              if (data.progress !== undefined) setProgress(data.progress);
              if (data.resumeId) {
                setStage("complete");
                if (user?.uid) {
                  const SESSION_KEY = `resume_creation_session_${user.uid}`;
                  localStorage.removeItem(SESSION_KEY);
                }
                setTimeout(() => {
                  router.push(`/resumes/${data.resumeId}`);
                }, 2000);
              } else {
                setStage("input");
              }
              return; // Success after retry
            }
          } catch (refreshError) {
            logger.error({ err: refreshError }, "Token refresh failed");
          }
        }

        throw new Error(
          `Failed to generate resume (${errorStatus}): ${errorDetail}`
        );
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
        if (user?.uid) {
          const SESSION_KEY = `resume_creation_session_${user.uid}`;
          localStorage.removeItem(SESSION_KEY);
        }
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
      // Log detailed error info
      const errorDetails =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : { error: String(error) };

      logger.error(
        {
          ...errorDetails,
          errorType: error?.constructor?.name,
        },
        "Error generating resume:"
      );

      let errorMessage = "An unexpected error occurred. Please try again.";
      const errorStr = error instanceof Error ? error.message : String(error);

      if (errorStr.includes("401")) {
        errorMessage = "Your session has expired. Please refresh the page.";
      } else if (errorStr.includes("429")) {
        errorMessage =
          "You're sending messages too fast. Please wait a moment.";
      } else if (errorStr.includes("500")) {
        errorMessage =
          "Our AI service is having a hiccup. Please try again in a minute.";
      } else if (errorStr.includes("fetch") || errorStr.includes("Network")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
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
        if (user?.uid) {
          const SESSION_KEY = `resume_creation_session_${user.uid}`;
          localStorage.removeItem(SESSION_KEY);
        }
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
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
        {/* Fixed Header */}
        <div className="flex-none z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm">
          <CreateResumeHeader aiConnectionStatus={aiConnectionStatus} />

          {isPremiumOrHigher && availableModels.length > 0 && (
            <div className="max-w-4xl mx-auto px-4 py-2 flex justify-end">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur px-3 py-1 rounded-full border border-border/50">
                <span>Model:</span>
                <select
                  value={selectedModelId || ""}
                  onChange={(e) =>
                    setSelectedModelId(e.target.value || undefined)
                  }
                  className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="">Auto (recommended)</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.provider} · ${model.costPer1MTokens}
                      /1M
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {showRestoreDialog && pendingSession && (
          <SessionRestoreDialog
            onContinue={handleContinueSession}
            onStartFresh={handleStartFresh}
            messageCount={pendingSession.messages.length}
            lastActivity={
              pendingSession.lastActivity
                ? new Date(pendingSession.lastActivity)
                : undefined
            }
          />
        )}

        {shouldShowProgress && (
          <div className="hidden lg:flex fixed top-32 right-10 z-20 justify-end pointer-events-none">
            <div className="pointer-events-auto">
              <ResumeProgress
                {...resumeProgressProps}
                className="border-primary/30 shadow-lg bg-card/80 backdrop-blur-md"
              />
            </div>
          </div>
        )}

        {/* Main Container with Fixed Chat and Input */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden">
          {/* Scrollable Chat Area - takes remaining space; padded for fixed input bar */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-4">
            {/* Progress Bar for Mobile */}
            {shouldShowProgress && (
              <div className="lg:hidden mb-6">
                <ResumeProgress {...resumeProgressProps} />
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <CreateResumeWelcome
                  onSuggestionClick={(text) => handleSubmit(undefined, text)}
                />
              </div>
            ) : (
              <div className="space-y-6 pb-2 pl-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-3 ${
                      message.isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!message.isUser && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-5 rounded-2xl shadow-sm ${
                        message.isUser
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-white/60 backdrop-blur-sm text-foreground border border-white/40 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-[10px] mt-2 ${
                          message.isUser
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

                {/* Scroll Anchor with extra spacing to prevent last message from being hidden behind expanding input */}
                <div ref={messagesEndRef} className="h-64" />
              </div>
            )}
          </div>

          {/* Fixed Bottom Input Area - consistent height, absolute positioning */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-sm shadow-2xl">
            <div className="px-4 pt-4 pb-6">
              {messages.length > 0 &&
                progress >= 60 &&
                stage !== "complete" &&
                !aiLoading && (
                  <div className="flex justify-center mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          </div>
        </div>
      </div>
    </DashboardBackground>
  );
}
