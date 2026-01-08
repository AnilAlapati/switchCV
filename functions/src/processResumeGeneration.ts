/**
 * Background Resume Generation Handler
 *
 * Processes resume generation jobs from the task queue.
 * This function is invoked by Cloud Tasks with extended timeout.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Types matching the queue service
type JobStatus = "pending" | "processing" | "completed" | "failed";

interface GenerationJobPayload {
    message: string;
    conversationHistory: Array<{
        id: string;
        content: string;
        isUser: boolean;
        timestamp: string;
    }>;
    sessionData?: any;
    modelId?: string;
    userTier: string;
}

interface GenerationJobResult {
    response: string;
    model: string;
    resumeId?: string;
    numericId?: number;
    created?: boolean;
    progress: number;
    sessionData?: any;
}

const JOBS_COLLECTION = "resumeGenerationJobs";

/**
 * Updates job status in Firestore
 */
async function updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: {
        progress?: number;
        result?: GenerationJobResult;
        error?: string;
    } = {}
): Promise<void> {
    const updateData: Record<string, unknown> = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (updates.progress !== undefined) {
        updateData.progress = updates.progress;
    }

    if (updates.result) {
        updateData.result = updates.result;
    }

    if (updates.error) {
        updateData.error = updates.error;
    }

    if (status === "completed" || status === "failed") {
        updateData.completedAt = FieldValue.serverTimestamp();
    }

    await db.collection(JOBS_COLLECTION).doc(jobId).update(updateData);

    functions.logger.info(`Updated job ${jobId} to status: ${status}`);
}

/**
 * Main handler for processing resume generation jobs
 */
export async function processResumeGenerationHandler(
    req: functions.https.Request,
    res: functions.Response
): Promise<void> {
    // Validate request method
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const { jobId } = req.body;

    if (!jobId) {
        res.status(400).json({ error: "Missing jobId" });
        return;
    }

    functions.logger.info(`Processing resume generation job: ${jobId}`);

    try {
        // Fetch the job from Firestore
        const jobDoc = await db.collection(JOBS_COLLECTION).doc(jobId).get();

        if (!jobDoc.exists) {
            functions.logger.error(`Job not found: ${jobId}`);
            res.status(404).json({ error: "Job not found" });
            return;
        }

        const job = jobDoc.data() as {
            userId: string;
            status: JobStatus;
            payload: GenerationJobPayload;
        };

        // Skip if already processed
        if (job.status !== "pending") {
            functions.logger.info(`Job ${jobId} already ${job.status}, skipping`);
            res.status(200).json({ status: job.status, skipped: true });
            return;
        }

        // Mark as processing
        await updateJobStatus(jobId, "processing", { progress: 10 });

        const { message, conversationHistory, sessionData, modelId, userTier } =
            job.payload;

        // Dynamically import the heavy AI modules
        const { ResumeDataExtractor } = await import("./services/resumeDataExtractor");
        const { ConversationManager } = await import("./services/conversationManager");
        const { buildConversationalPrompt, extractResumeJSON, isCompletionResponse } = await import("./services/resumePrompts");
        const { getActiveConfig } = await import("./services/conversationConfig");

        // Step 1: Extract data from conversation
        const extractionResult = ResumeDataExtractor.extractFromConversation([
            ...conversationHistory,
            { content: message, isUser: true },
        ]);

        await updateJobStatus(jobId, "processing", { progress: 20 });

        // Step 2: Initialize conversation manager
        const conversationManager = new ConversationManager(
            sessionData?.collectedData || extractionResult.data
        );
        conversationManager.updateData(extractionResult.data);
        const progress = conversationManager.getProgress();

        await updateJobStatus(jobId, "processing", { progress: 30 });

        // Step 3: Get configuration and build prompt
        let config = getActiveConfig();

        const allText = [...conversationHistory, { content: message, isUser: true }]
            .filter((m) => m.isUser)
            .map((m) => m.content)
            .join(" ");

        const questionLimitMatch = allText.match(/only\s+(\d+)\s+questions?/i);
        if (questionLimitMatch?.[1]) {
            const limit = parseInt(questionLimitMatch[1], 10);
            if (!isNaN(limit) && limit > 0) {
                config = {
                    ...config,
                    maxQuestionsInBetaMode: true,
                    maxBetaQuestions: limit,
                };
            }
        }

        const userWantsToCreate =
            /create|generate|finish|done|make it|go ahead|yes|sure|ok|yep|yeah/i.test(
                message
            );

        const currentProgress = {
            hasName: !!conversationManager.getData().name,
            hasEmail: !!conversationManager.getData().email,
            hasExperience: !!conversationManager.getData().experience?.length,
            hasEducation: !!conversationManager.getData().education?.length,
            hasSkills: !!conversationManager.getData().skills?.length,
        };

        const prompt = buildConversationalPrompt(
            message,
            conversationHistory,
            currentProgress,
            conversationManager.getData(),
            config,
            userWantsToCreate
        );

        await updateJobStatus(jobId, "processing", { progress: 40 });

        // Step 4: Generate AI response
        const { generateTextWithTier } = await import("./services/aiProviderService");
        const { generateText } = await import("./services/aiGenerationService");

        let aiResponse: { text: string; model: string };

        try {
            aiResponse = await generateTextWithTier({
                prompt,
                maxTokens: 4000,
                temperature: 0.7,
                userTier: userTier as any,
                modelId,
            });
        } catch (tieredError) {
            functions.logger.warn(
                `Tier-based AI failed, falling back to legacy`,
                tieredError
            );
            const legacyResult = await generateText(prompt, 4000, 0.7);
            aiResponse = { text: legacyResult.text, model: legacyResult.model || "default" };
        }

        await updateJobStatus(jobId, "processing", { progress: 70 });

        // Step 5: Check if ready to create resume
        const aiIndicatesCompletion = isCompletionResponse(aiResponse.text);

        let shouldCreateResume = false;
        if (config.maxQuestionsInBetaMode) {
            shouldCreateResume =
                aiIndicatesCompletion ||
                progress.completenessPercentage >= config.completionThreshold ||
                (userWantsToCreate && progress.hasMinimumData);
        } else {
            shouldCreateResume =
                aiIndicatesCompletion ||
                progress.isReadyToCreate ||
                (userWantsToCreate && progress.hasMinimumData);
        }

        await updateJobStatus(jobId, "processing", { progress: 80 });

        // Step 6: Create resume if ready
        if (shouldCreateResume && progress.hasMinimumData) {
            let resumeData = extractResumeJSON(aiResponse.text);

            if (!resumeData) {
                resumeData = conversationManager.getData();
            }

            const validation = conversationManager.validate();
            if (!validation.valid) {
                let safeResponse = aiResponse.text;
                if (extractResumeJSON(aiResponse.text)) {
                    safeResponse =
                        "I'm almost ready to create your resume, but I need a few more details. " +
                        (validation.errors.length > 0
                            ? "Specifically: " + validation.errors.join(", ")
                            : "Please provide more information.");
                }

                await updateJobStatus(jobId, "completed", {
                    progress: 100,
                    result: {
                        response: safeResponse,
                        model: aiResponse.model,
                        progress: progress.completenessPercentage,
                        sessionData: {
                            collectedData: conversationManager.getData(),
                            progress,
                        },
                    },
                });

                res.status(200).json({ success: true, jobId });
                return;
            }

            // Save the resume
            const { saveGeneratedResume } = await import("./resumeService");
            const { resumeId, numericId } = await saveGeneratedResume(
                job.userId,
                resumeData
            );

            await updateJobStatus(jobId, "completed", {
                progress: 100,
                result: {
                    response:
                        aiResponse.text +
                        `\n\n✅ Great! I've created your resume. You can view it now!`,
                    model: aiResponse.model,
                    resumeId,
                    numericId,
                    created: true,
                    progress: 100,
                },
            });

            res.status(200).json({ success: true, jobId, resumeId });
            return;
        }

        // Step 7: Continue conversation (not ready yet)
        await updateJobStatus(jobId, "completed", {
            progress: 100,
            result: {
                response: aiResponse.text,
                model: aiResponse.model,
                progress: progress.completenessPercentage,
                sessionData: {
                    collectedData: conversationManager.getData(),
                    progress,
                },
            },
        });

        res.status(200).json({ success: true, jobId });
    } catch (error) {
        functions.logger.error(`Failed to process job ${jobId}:`, error);

        await updateJobStatus(jobId, "failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });

        res.status(500).json({
            error: "Processing failed",
            jobId,
        });
    }
}
