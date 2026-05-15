"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import type { ResumeUploadDraft } from "@/types/resumeUpload";

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface SessionData {
  userId: string;
  messages: Message[];
  stage: "input" | "generating" | "complete";
  sessionData: unknown;
  progress: number;
  needsClarification?: boolean;
  clarificationIssues?: string[];
  lastActivity?: string;
}

interface ResumeGenerationResponse {
  response?: string;
  sessionData?: unknown;
  progress?: number;
  resumeId?: string;
  needsClarification?: boolean;
  missingEvidenceFields?: string[];
  clarificationChecklist?: string[];
}

type ResumeGenerationInputSource = "chat" | "paste" | "pdf" | "docx";

interface RunGenerationOptions {
  displayMessage: string;
  generationMessage: string;
  requestSessionData?: unknown;
  inputSources?: ResumeGenerationInputSource[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getGenerationErrorMessage(response: Response): Promise<string> {
  const errorData = (await response.json().catch(() => null)) as unknown;
  const serverMessage =
    isRecord(errorData) && typeof errorData.error === "string"
      ? errorData.error
      : null;

  return response.status < 500 && serverMessage
    ? serverMessage
    : "Something went wrong. Please try again.";
}

export function useResumeCreation() {
  const { user } = useAuth();
  const { isPremiumOrHigher } = useTier();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [stage, setStage] = useState<"input" | "generating" | "complete">(
    "input",
  );
  const [createdResumeId, setCreatedResumeId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiConnectionStatus, setAiConnectionStatus] = useState<{
    connected: boolean;
    model?: string;
  } | null>(null);
  const [sessionData, setSessionData] = useState<unknown>(null);
  const [progress, setProgress] = useState<number>(0);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationIssues, setClarificationIssues] = useState<string[]>([]);
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
    null,
  );

  // Load session on mount
  useEffect(() => {
    if (!user?.uid) return;

    const SESSION_KEY = `resume_creation_session_${user.uid}`;
    const savedSession = localStorage.getItem(SESSION_KEY);

    if (savedSession) {
      try {
        const parsed: SessionData = JSON.parse(savedSession);
        if (
          parsed.userId === user.uid &&
          parsed.messages &&
          parsed.messages.length > 0
        ) {
          setPendingSession(parsed);
          setShowRestoreDialog(true);
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to restore session");
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, [user?.uid]);

  // Save session on change
  useEffect(() => {
    if (!user?.uid) return;

    if (messages.length > 0 || stage !== "input" || progress > 0) {
      const SESSION_KEY = `resume_creation_session_${user.uid}`;
      const sessionToSave: SessionData = {
        userId: user.uid,
        messages,
        stage,
        sessionData,
        progress,
        needsClarification,
        clarificationIssues,
        lastActivity: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
    }
  }, [
    messages,
    stage,
    sessionData,
    progress,
    needsClarification,
    clarificationIssues,
    user?.uid,
  ]);

  const handleContinueSession = useCallback(() => {
    if (!pendingSession) return;
    setMessages(
      pendingSession.messages.map((m: Message) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    );
    if (pendingSession.stage) setStage(pendingSession.stage);
    if (pendingSession.sessionData) setSessionData(pendingSession.sessionData);
    if (pendingSession.progress) setProgress(pendingSession.progress);
    setNeedsClarification(!!pendingSession.needsClarification);
    setClarificationIssues(pendingSession.clarificationIssues || []);
    setShowRestoreDialog(false);
    setPendingSession(null);
    logger.info(
      {
        userId: pendingSession.userId,
        messageCount: pendingSession.messages.length,
      },
      "Session restored",
    );
  }, [pendingSession]);

  const handleStartFresh = useCallback(() => {
    if (!user?.uid) return;
    localStorage.removeItem(`resume_creation_session_${user.uid}`);
    setMessages([]);
    setStage("input");
    setCreatedResumeId(null);
    setProgress(0);
    setSessionData(null);
    setNeedsClarification(false);
    setClarificationIssues([]);
    setShowRestoreDialog(false);
    setPendingSession(null);
    logger.info({ userId: user.uid }, "Started fresh resume creation session");
  }, [user?.uid]);

  const checkAIStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/status");
      if (response.ok) {
        const data = await response.json();
        setAiConnectionStatus(data);
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to check AI status");
      setAiConnectionStatus({ connected: false });
    }
  }, []);

  const loadModels = useCallback(async () => {
    if (!isPremiumOrHigher) return;
    try {
      const response = await fetch("/api/ai/models");
      if (!response.ok) return;
      const data = await response.json();
      setAvailableModels(data.models || []);
    } catch (error) {
      logger.error({ err: error }, "Failed to load AI models");
    }
  }, [isPremiumOrHigher]);

  useEffect(() => {
    checkAIStatus();
    loadModels();
  }, [checkAIStatus, loadModels]);

  const runGeneration = useCallback(
    async ({
      displayMessage,
      generationMessage,
      requestSessionData,
      inputSources,
    }: RunGenerationOptions) => {
      if (!user) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        content: displayMessage,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setCurrentInput("");
      setAiLoading(true);
      setAiError(null);
      setNeedsClarification(false);
      setClarificationIssues([]);
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
            message: generationMessage,
            conversationHistory: messages,
            sessionData: requestSessionData ?? null,
            inputSources,
            modelId: selectedModelId,
          }),
        });

        if (!response.ok) {
          throw new Error(await getGenerationErrorMessage(response));
        }

        const data = (await response.json()) as ResumeGenerationResponse;
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response || "Resume generated successfully!",
          isUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        if (data.sessionData) setSessionData(data.sessionData);
        if (data.progress !== undefined) setProgress(data.progress);
        setNeedsClarification(!!data.needsClarification);
        setClarificationIssues(
          data.clarificationChecklist || data.missingEvidenceFields || [],
        );

        if (data.resumeId) {
          setCreatedResumeId(data.resumeId);
          setStage("complete");
          localStorage.removeItem(`resume_creation_session_${user.uid}`);
          setTimeout(() => router.push(`/resumes/${data.resumeId}`), 500);
        } else {
          setStage("input");
        }
      } catch (error) {
        logger.error({ err: error }, "Error generating resume");
        setAiError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        );
        setStage("input");
      } finally {
        setAiLoading(false);
      }
    },
    [user, messages, selectedModelId, router],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent, overrideInput?: string) => {
      if (e) e.preventDefault();
      const input = overrideInput ?? currentInput;
      if (!input.trim()) return;

      await runGeneration({
        displayMessage: input,
        generationMessage: input,
        requestSessionData: sessionData,
      });
    },
    [currentInput, runGeneration, sessionData],
  );

  const handleForceCreate = useCallback(async () => {
    await runGeneration({
      displayMessage: "Create my resume now",
      generationMessage: "Create my resume now",
      requestSessionData: sessionData,
    });
  }, [runGeneration, sessionData]);

  const handleUploadedDraft = useCallback(
    async (uploadDraft: ResumeUploadDraft) => {
      // Tell the AI explicitly that the data is already in the session so it
      // doesn't ask for fields that were already extracted from the file.
      const extractedFieldNames = uploadDraft.extractedFields.join(", ");
      const generationMessage = `I uploaded my resume file "${uploadDraft.fileName}". The extracted data is already in your CURRENTLY COLLECTED DATA (fields: ${extractedFieldNames}). Please review it and create my resume now without asking for fields that are already present.`;
      await runGeneration({
        displayMessage: `Uploaded resume file: ${uploadDraft.fileName}`,
        generationMessage,
        requestSessionData: {
          collectedData: uploadDraft.extractedData,
          wasFileUpload: true,
          uploadSource: {
            fileName: uploadDraft.fileName,
            sourceChannel: uploadDraft.sourceChannel,
            extractionMethod: uploadDraft.extractionMethod,
          },
          ...(uploadDraft.rawText
            ? { sourceRawText: uploadDraft.rawText }
            : {}),
        },
        inputSources: [uploadDraft.sourceChannel],
      });
    },
    [runGeneration],
  );

  return {
    messages,
    currentInput,
    setCurrentInput,
    stage,
    createdResumeId,
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
    handleUploadedDraft,
  };
}
