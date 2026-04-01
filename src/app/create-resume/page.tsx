"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTier } from "@/hooks/useTier";
import { useRouter } from "next/navigation";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { CreateResumeHeader } from "@/components/create-resume/CreateResumeHeader";
import { CreateResumeInputForm } from "@/components/create-resume/CreateResumeInputForm";
import { CreateResumeWelcome } from "@/components/create-resume/CreateResumeWelcome";
import { AILoadingState } from "@/components/create-resume/AILoadingState";
import { ResumeProgress } from "@/components/create-resume/ResumeProgress";
import { SessionRestoreDialog } from "@/components/create-resume/SessionRestoreDialog";
import { ResumePreview } from "@/components/ResumePreview";
import { getVerificationRoute } from "@/lib/config";
import { Bot, User } from "lucide-react";
import { useResumeCreation } from "@/hooks/useResumeCreation";
import { mapSessionDataToPreviewProfile } from "./previewProfile";


const VERIFICATION_ROUTE = getVerificationRoute();

export default function CreateResume() {
  const { user, loading: authLoading, needsEmailVerification } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();
  const { isPremiumOrHigher } = useTier();
  const router = useRouter();

  const {
    messages,
    currentInput,
    setCurrentInput,
    stage,
    aiLoading,
    aiError,
    aiConnectionStatus,
    sessionData,
    progress,
    needsClarification,
    clarificationIssues,
    availableModels,
    selectedModelId,
    setSelectedModelId,
    showRestoreDialog,
    pendingSession,
    handleContinueSession,
    handleStartFresh,
    handleSubmit,
    handleForceCreate,
  } = useResumeCreation();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);

  const loading = authLoading || profileLoading;

  const scrollToBottom = () => {
    const el = messagesEndRef.current as HTMLElement | null;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "auto", block: "end" });
    }
  };

  useEffect(() => {
    if (messages.length === 0) {
      previousMessageCount.current = 0;
      return;
    }
    if (previousMessageCount.current > 0) {
      requestAnimationFrame(() => scrollToBottom());
    }
    previousMessageCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else if (needsEmailVerification) {
        router.push(VERIFICATION_ROUTE);
      } else if (!role) {
        router.push("/select-role");
      } else if (role !== "jobseeker") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, needsEmailVerification, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  const resumeProgressProps = {
    progress,
    collectedFields: (sessionData as any)?.progress?.collectedFields,
    missingFields: (sessionData as any)?.progress?.missingFields,
  };

  const shouldShowProgress = progress > 0;

  const previewProfile = mapSessionDataToPreviewProfile(
    ((sessionData as Record<string, unknown>)?.collectedData as Record<string, unknown>) ||
      {},
  );

  return (
    <DashboardBackground>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
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

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col relative w-full lg:w-1/2 lg:max-w-3xl mx-auto lg:border-r lg:border-border/50 bg-background overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-4">
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
                {needsClarification && clarificationIssues.length > 0 && (
                  <div
                    className="max-w-3xl rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950 shadow-sm"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="font-semibold text-sm">
                      A few quick details are still needed
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                      Reply with just the missing pieces below and I can keep
                      going.
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                      {clarificationIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

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
                      <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0 border-2 border-black">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                <AILoadingState aiLoading={aiLoading} aiError={aiError} />
                <div ref={messagesEndRef} className="h-64" />
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-sm shadow-2xl">
            <div className="px-4 pt-4 pb-6">
              {messages.length > 0 &&
                progress >= 60 &&
                stage !== "complete" &&
                !aiLoading &&
                !needsClarification && (
                  <div className="flex justify-center mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                      onClick={handleForceCreate}
                      aria-label="Create resume now"
                      className="bg-black hover:bg-gray-800 text-white px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] font-bold flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] text-sm border-2 border-black"
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

          {/* Preview Column */}
          <div className="hidden lg:flex flex-col w-1/2 bg-gray-50/50 overflow-y-auto relative">
            {shouldShowProgress && (
              <div className="absolute top-4 right-4 z-20">
                <ResumeProgress
                  {...resumeProgressProps}
                  className="border-primary/30 shadow-lg bg-card/80 backdrop-blur-md"
                />
              </div>
            )}
            <div className="p-8 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
                👁️ Live Preview
              </div>
              <ResumePreview profile={previewProfile} compact={false} />
            </div>
          </div>
        </div>
      </div>
    </DashboardBackground>
  );
}
