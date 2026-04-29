import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { BillingService } from "@/lib/services/billingService";
import { DocumentParser } from "@/lib/services/documentParser";
import { createAIObservationContext } from "@/lib/services/aiMonitoringService";
import { isFeatureEnabled } from "@/lib/services/featureFlagService";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";
import { getUserTier } from "@/lib/services/userService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { containsPromptInjection } from "@/lib/utils/promptSafety";
import { logger } from "@/lib/logger";
import type { SubscriptionTier } from "@/lib/config";
import type {
  ResumeUploadDraft,
  ResumeUploadSourceChannel,
} from "@/types/resumeUpload";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 32_000;
const MIN_TEXT_CHARS = 80;

const MIME_BY_EXTENSION = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".txt": ["text/plain"],
} as const;

type AllowedExtension = keyof typeof MIME_BY_EXTENSION;

function getAllowedExtension(fileName: string): AllowedExtension | null {
  const lowerName = fileName.toLowerCase();
  for (const ext of Object.keys(MIME_BY_EXTENSION) as AllowedExtension[]) {
    if (lowerName.endsWith(ext)) return ext;
  }
  return null;
}

function getSourceChannel(ext: AllowedExtension): ResumeUploadSourceChannel {
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  return "paste";
}

function isAllowedMime(ext: AllowedExtension, mimeType: string): boolean {
  const allowedMimes: readonly string[] = MIME_BY_EXTENSION[ext];
  return allowedMimes.includes(mimeType);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;
  if (userId === undefined) {
    return handleApiError(null, "Unauthorized", 401, request);
  }

  try {
    const userTier = (await getUserTier(userId)) as SubscriptionTier;

    const enabled = await isFeatureEnabled("resume_file_upload", {
      tier: userTier,
    });
    if (!enabled) {
      return NextResponse.json(
        { error: "File upload is not available on your plan" },
        { status: 403 },
      );
    }

    const rateLimit = await checkDistributedRateLimit(userId, {
      tier: userTier,
      scope: "ai_generation",
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const budgetAllowed = await BillingService.checkBudget(userId, userTier);
    if (!budgetAllowed) {
      return NextResponse.json(
        { error: "Monthly usage limit reached. Please upgrade your plan." },
        { status: 402 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 5 MB limit" },
        { status: 400 },
      );
    }

    const ext = getAllowedExtension(file.name);
    if (ext === null) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are supported" },
        { status: 400 },
      );
    }

    if (!isAllowedMime(ext, file.type)) {
      return NextResponse.json(
        { error: "File type does not match the uploaded file extension" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await DocumentParser.parseFile(buffer, file.name, file.type);

    if (rawText.trim().length < MIN_TEXT_CHARS) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this file. It may be a scanned PDF. Please paste your resume text instead.",
          code: "SCANNED_PDF",
        },
        { status: 422 },
      );
    }

    const textForAI = rawText.slice(0, MAX_TEXT_CHARS);
    if (containsPromptInjection(textForAI)) {
      logger.warn({ userId, fileName: file.name }, "Prompt injection detected");
      return NextResponse.json(
        {
          error:
            "The uploaded file contains content that cannot be processed. Please upload a standard resume.",
        },
        { status: 400 },
      );
    }

    const requestId = randomUUID();
    const observationContext = createAIObservationContext({
      userId,
      userTier,
      entrypoint: "resume_upload_extract",
      requestId,
    });

    const sourceChannel = getSourceChannel(ext);
    const startTime = Date.now();
    const normalized = await ResumeIntakeNormalizer.normalizeWithAI(
      {
        sources: [{ channel: sourceChannel, text: textForAI }],
      },
      {
        userTier,
        observationContext,
      },
    );

    const uploadDraft: ResumeUploadDraft = {
      sourceChannel,
      fileName: file.name,
      extractedData: normalized.draft.extractedData,
      extractedFields: normalized.draft.extractedFields,
      missingFields: normalized.missingCriticalFields,
      extractionMethod: normalized.extractionMethod,
      latencyMs: Date.now() - startTime,
    };

    logger.info(
      {
        userId,
        requestId,
        fileName: file.name,
        extractedFields: uploadDraft.extractedFields,
        missingFields: uploadDraft.missingFields,
        extractionMethod: uploadDraft.extractionMethod,
      },
      "Resume upload extraction complete",
    );

    return NextResponse.json({ uploadDraft }, { status: 200 });
  } catch (routeError: unknown) {
    return handleApiError(
      routeError,
      "Failed to process uploaded file",
      500,
      request,
    );
  }
}
