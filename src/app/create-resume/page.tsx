"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, loading } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

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
        console.error("Failed to check AI status:", error);
        setAiConnectionStatus({ connected: false });
      }
    };
    checkAIStatus();
  }, []);

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
          router.push(`/resume/${data.resumeId}`);
        }, 2000);
      } else {
        // Continue conversation - reset to input stage
        setStage("input");
      }
    } catch (error) {
      console.error("Error generating resume:", error);
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      <CreateResumeHeader aiConnectionStatus={aiConnectionStatus} />

      <div className="max-w-4xl mx-auto p-4">
        {/* Messages/Chat History */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 mb-4 min-h-[400px] max-h-[600px] overflow-y-auto p-6">
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
            </div>
          )}
        </div>

        <ResumeProgress
          progress={progress}
          collectedFields={sessionData?.progress?.collectedFields}
          missingFields={sessionData?.progress?.missingFields}
        />

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
