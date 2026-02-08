"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

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
    lastActivity?: string;
}

export function useResumeCreation() {
    const { user } = useAuth();
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
    const [sessionData, setSessionData] = useState<unknown>(null);
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

    // Load session on mount
    useEffect(() => {
        if (!user?.uid) return;

        const SESSION_KEY = `resume_creation_session_${user.uid}`;
        const savedSession = localStorage.getItem(SESSION_KEY);

        if (savedSession) {
            try {
                const parsed: SessionData = JSON.parse(savedSession);
                if (parsed.userId === user.uid && parsed.messages && parsed.messages.length > 0) {
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
                lastActivity: new Date().toISOString(),
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
        }
    }, [messages, stage, sessionData, progress, user?.uid]);

    const handleContinueSession = () => {
        if (!pendingSession) return;
        setMessages(
            pendingSession.messages.map((m: Message) => ({
                ...m,
                timestamp: new Date(m.timestamp),
            }))
        );
        if (pendingSession.stage) setStage(pendingSession.stage);
        if (pendingSession.sessionData) setSessionData(pendingSession.sessionData);
        if (pendingSession.progress) setProgress(pendingSession.progress);
        setShowRestoreDialog(false);
        setPendingSession(null);
        logger.info("✅ Session restored");
    };

    const handleStartFresh = () => {
        if (!user?.uid) return;
        localStorage.removeItem(`resume_creation_session_${user.uid}`);
        setMessages([]);
        setStage("input");
        setProgress(0);
        setSessionData(null);
        setShowRestoreDialog(false);
        setPendingSession(null);
        logger.info("🆕 Started fresh");
    };

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
                throw new Error(`Failed: ${response.statusText}`);
            }

            const data = await response.json();
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
                if (user?.uid) localStorage.removeItem(`resume_creation_session_${user.uid}`);
                setTimeout(() => router.push(`/resumes/${data.resumeId}`), 2000);
            } else {
                setStage("input");
            }
        } catch (error) {
            logger.error({ err: error }, "Error generating resume");
            setAiError(error instanceof Error ? error.message : "Unexpected error");
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
            setAiError(error instanceof Error ? error.message : "An unexpected error occurred.");
            setStage("input");
        } finally {
            setAiLoading(false);
        }
    };

    return {
        messages,
        currentInput,
        setCurrentInput,
        stage,
        aiLoading,
        aiError,
        aiConnectionStatus,
        sessionData,
        progress,
        availableModels,
        selectedModelId,
        setSelectedModelId,
        showRestoreDialog,
        pendingSession,
        handleContinueSession,
        handleStartFresh,
        handleSubmit,
        handleForceCreate,
    };
}
