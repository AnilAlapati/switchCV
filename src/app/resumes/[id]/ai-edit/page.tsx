"use client";

import { logger } from "@/lib/logger";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ResumeEditChatHeader } from "@/components/resume/ResumeEditChatHeader";
import { ResumeEditChatInput } from "@/components/resume/ResumeEditChatInput";
import { ResumeEditChatStatus } from "@/components/resume/ResumeEditChatStatus";
import Link from "next/link";
import { ResumeEditMessageList } from "@/components/resume/ResumeEditMessageList";
import { ResumeSnapshotCard } from "@/components/resume/ResumeSnapshotCard";
import { getVerificationRoute } from "@/lib/config";
import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";

const VERIFICATION_ROUTE = getVerificationRoute();

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface SessionData {
  [key: string]: unknown;
}

interface ResumeMeta {
  title?: string | null;
  summary?: string | null;
  updatedAt?: string | null;
  numericId?: number | string | null;
}

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && (!user || needsEmailVerification)) {
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
            : "Failed to load resume context"
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
        // After applying updates successfully, let the user continue with more changes.
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

  if (!resumeId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-300">Resume ID is missing from the URL.</p>
      </div>
    );
  }

  if (!initialised || tierLoading || tier === "basic") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">
            {tier === "basic" ? "Redirecting..." : "Loading editor…"}
          </p>
        </div>
      </div>
    );
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
          {resumeMissing && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 text-yellow-200">
              <p className="font-semibold mb-2">No resume on file yet</p>
              <p className="text-sm mb-3">
                I can only edit an existing resume. Start by creating one with
                our AI Resume Builder, then return here to keep refining it.
              </p>
              <Link
                href="/create-resume"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold rounded-lg"
              >
                Launch AI Resume Builder
              </Link>
            </div>
          )}

          {resumeMeta && (
            <ResumeSnapshotCard
              resumeId={resumeId}
              title={resumeMeta.title}
              summary={resumeMeta.summary}
              updatedAt={resumeMeta.updatedAt ?? null}
            />
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
