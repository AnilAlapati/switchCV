"use client";

import { logger } from "@/lib/logger";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ResumeEditChatHeader } from "@/components/resume/ResumeEditChatHeader";
import { ResumeEditChatInput } from "@/components/resume/ResumeEditChatInput";
import { ResumeEditChatStatus } from "@/components/resume/ResumeEditChatStatus";
import { ResumeEditMessageList } from "@/components/resume/ResumeEditMessageList";
import { ResumeSnapshotCard } from "@/components/resume/ResumeSnapshotCard";
import { getVerificationRoute } from "@/lib/config";
import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";
import { toast } from "sonner";

const VERIFICATION_ROUTE = getVerificationRoute();

import { Message, SessionData, ResumeMeta } from "./types";
import {
  AIEditMissingIdView,
  AIEditLoadingView,
  ResumeMissingNotice,
} from "./AiEditComponents";

export default function ResumeAIEditPage() {
  const params = useParams<{ id: string }>();
  const resumeId = params?.id;
  const router = useRouter();
  const { user, loading, needsEmailVerification } = useAuth();
  const { tier, loading: tierLoading } = useUserProfile();

  useEffect(() => {
    if (!tierLoading && tier === "basic") {
      router.replace("/dashboard");
    }
  }, [tier, tierLoading, router]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(null);
  const [resumeMissing, setResumeMissing] = useState(false);
  const [aiConnectionStatus, setAiConnectionStatus] = useState<{
    connected: boolean;
    model?: string;
  } | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const originalResume = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
      return;
    }
    if (!loading && user && needsEmailVerification) {
      router.push(VERIFICATION_ROUTE);
    }
  }, [loading, user, needsEmailVerification, router]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
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
    if (!user || !resumeId || initialised) {
      return;
    }

    const loadInitialContext = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/resumes/${resumeId}/chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load resume context: ${response.status}`);
        }

        const data = await response.json();

        if (data.resumeExists === false) {
          setResumeMissing(true);
        } else if (data.resume) {
          originalResume.current = data.resume;
          setResumeMeta({
            title: data.resume.title ?? null,
            summary: data.resume.summary ?? null,
            updatedAt:
              data.resume.updatedAt ?? data.resume.lastUpdatedAt ?? null,
            numericId:
              data.metadata?.numericId ?? data.resume.numericId ?? resumeId,
          });
        }

        if (data.greeting) {
          const greetingMessage: Message = {
            id: `greeting-${Date.now()}`,
            content: data.greeting,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages([greetingMessage]);
        }

        if (data.sessionData) {
          setSessionData(data.sessionData as SessionData);
        } else {
          setSessionData(null);
        }
      } catch (error) {
        logger.error({ err: error }, "Error loading resume edit context:");
        setAiError(
          error instanceof Error
            ? error.message
            : "Failed to load resume context",
        );
      } finally {
        setInitialised(true);
      }
    };

    void loadInitialContext();
  }, [user, resumeId, initialised]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !resumeId || !input.trim()) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setAiError(null);

    try {
      const token = await user.getIdToken();
      const historyPayload = [...messages, userMessage].map((msg) => ({
        content: msg.content,
        isUser: msg.isUser,
      }));

      const response = await fetch(`/api/resumes/${resumeId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: historyPayload,
          sessionData,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update resume");
      }

      if (data.resumeMissing) {
        setResumeMissing(true);
      }

      if (data.resume) {
        setHasChanges(true);
        setResumeMeta({
          title: data.resume.title ?? resumeMeta?.title ?? null,
          summary: data.resume.summary ?? resumeMeta?.summary ?? null,
          updatedAt: data.resume.updatedAt ?? data.resume.lastUpdatedAt ?? null,
          numericId: data.resume.numericId ?? resumeMeta?.numericId ?? resumeId,
        });
      }

      if (data.sessionData) {
        setSessionData(data.sessionData as SessionData);
      }

      if (data.response) {
        const aiMessage: Message = {
          id: `${Date.now()}-ai`,
          content: data.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }

      if (data.completed) {
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      logger.error({ err: error }, "Error during resume edit chat:");
      setAiError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardChanges = useCallback(async () => {
    if (!user || !resumeId || !originalResume.current) return;

    setIsReverting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resume: originalResume.current }),
      });

      if (!response.ok) {
        throw new Error("Failed to revert resume");
      }

      setResumeMeta({
        title: (originalResume.current.title as string) ?? null,
        summary: (originalResume.current.summary as string) ?? null,
        updatedAt:
          (originalResume.current.updatedAt as string) ??
          (originalResume.current.lastUpdatedAt as string) ??
          null,
        numericId:
          (originalResume.current.numericId as string | number) ?? resumeId,
      });
      setHasChanges(false);
      setShowRevertConfirm(false);
      toast.success("Resume reverted to its original state.");
    } catch (error) {
      logger.error({ err: error }, "Error reverting resume changes");
      toast.error("Failed to discard changes. Please try again.");
    } finally {
      setIsReverting(false);
    }
  }, [user, resumeId]);

  if (!resumeId) {
    return <AIEditMissingIdView />;
  }

  if (!initialised || tierLoading || tier === "basic") {
    return <AIEditLoadingView tier={tier} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-[#1A2F25]">
      <div className="fixed inset-0 z-0">
        <BackgroundBlobs />
      </div>
      <div className="relative z-10">
        <ResumeEditChatHeader
          connectionStatus={aiConnectionStatus}
          resumeTitle={resumeMeta?.title ?? null}
        />

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {resumeMissing && <ResumeMissingNotice />}

          {resumeMeta && (
            <ResumeSnapshotCard
              resumeId={resumeId}
              title={resumeMeta.title}
              summary={resumeMeta.summary}
              updatedAt={resumeMeta.updatedAt ?? null}
            />
          )}

          {hasChanges && !resumeMissing && (
            <div className="relative">
              {!showRevertConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowRevertConfirm(true)}
                  disabled={isReverting || isProcessing}
                  className="text-sm text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors disabled:opacity-50"
                  aria-label="Discard all AI changes and revert to original resume"
                >
                  Discard all changes
                </button>
              ) : (
                <div
                  className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                  role="alert"
                >
                  <p className="text-sm text-red-800">
                    Revert resume to its state before this editing session?
                  </p>
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={isReverting}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isReverting ? "Reverting…" : "Yes, revert"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevertConfirm(false)}
                    disabled={isReverting}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <ResumeEditMessageList messages={messages} endRef={messagesEndRef} />

          <ResumeEditChatStatus
            isProcessing={isProcessing}
            errorMessage={aiError}
          />

          <ResumeEditChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isProcessing || resumeMissing}
            placeholder={
              resumeMissing
                ? "Create a resume first, then come back to edit it here."
                : "Describe the change—add achievements, tweak language, or remove outdated info..."
            }
          />
        </div>
      </div>
    </div>
  );
}
