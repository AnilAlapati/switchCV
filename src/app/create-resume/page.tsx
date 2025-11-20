"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { CreateResumeHeader } from "@/components/create-resume/CreateResumeHeader";
import { CreateResumeInputForm } from "@/components/create-resume/CreateResumeInputForm";
import { AILoadingState } from "@/components/create-resume/AILoadingState";

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

  const handleCreateResume = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/resume/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: "My New Resume",
          summary: "Created via AI Assistant",
          skills: ["JavaScript", "React", "Next.js"],
          experience: [],
          education: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/resume/${data.resumeId}`);
      }
    } catch (error) {
      console.error("Failed to create resume", error);
    }
  };

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

      if (data.resumeId) {
        setStage("complete");
        // Optionally redirect to the resume view
        // router.push(`/resume/${data.resumeId}`);
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
    <div className="min-h-screen bg-gray-900 text-white">
      <CreateResumeHeader aiConnectionStatus={aiConnectionStatus} />

      <div className="max-w-4xl mx-auto px-4 pt-4 flex justify-end">
        <button
          onClick={handleCreateResume}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Create Empty Resume (Skip AI)
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Messages/Chat History */}
        <div className="bg-gray-800 rounded-lg mb-4 min-h-[400px] max-h-[600px] overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg mb-2">Welcome to AI Resume Assistant!</p>
              <p>
                Start by telling me about your experience, skills, or what kind
                of job you're looking for.
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
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
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
