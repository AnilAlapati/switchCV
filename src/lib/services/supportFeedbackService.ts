import { APP_CONFIG } from "@/config/constants";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import {
  CATEGORY_LABELS,
  DEFAULT_FEEDBACK_CATEGORY,
  DEFAULT_FEEDBACK_URGENCY,
  FEEDBACK_CATEGORIES,
  FEEDBACK_URGENCY,
  FeedbackCategory,
  FeedbackUrgency,
  URGENCY_LABELS,
} from "@/config/supportFeedback";
import type {
  SupportFeedbackMeta,
  SupportFeedbackPayload,
  SupportFeedbackResult,
} from "@/types/supportFeedback";
import { adminDb } from "@/lib/firebase-admin";
import {
  buildFeedbackEmailHtml,
  buildFeedbackEmailText,
} from "./feedbackEmailTemplate";

export class SupportFeedbackError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SupportFeedbackError";
    this.statusCode = statusCode;
  }
}

// Rate limiting: track submissions per IP (in-memory for simplicity)
// In production, you might want to use Redis or Firestore
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 submissions per hour per IP

/**
 * Check if the IP has exceeded rate limits
 * Returns true if rate limited, false otherwise
 */
export function checkRateLimit(ip: string | null | undefined): boolean {
  if (!ip) return false; // Can't rate limit without IP

  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // New window or expired, start fresh
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true; // Rate limited
  }

  // Increment count
  record.count++;
  return false;
}

/**
 * Get remaining submissions for an IP
 */
export function getRateLimitRemaining(ip: string | null | undefined): number {
  if (!ip) return RATE_LIMIT_MAX_REQUESTS;

  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    return RATE_LIMIT_MAX_REQUESTS;
  }

  return Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count);
}

const DEFAULT_CATEGORY: FeedbackCategory = DEFAULT_FEEDBACK_CATEGORY;
const DEFAULT_URGENCY: FeedbackUrgency = DEFAULT_FEEDBACK_URGENCY;

type RequiredPayload = Required<
  Pick<SupportFeedbackPayload, "email" | "message" | "category" | "urgency">
> &
  Omit<SupportFeedbackPayload, "email" | "message" | "category" | "urgency">;

const SUPPORT_EMAIL_TO = () =>
  process.env.SUPPORT_FEEDBACK_TO || APP_CONFIG.SUPPORT_EMAIL;
const DRY_RUN = () => process.env.SUPPORT_FEEDBACK_DRY_RUN === "true";

const MAIL_COLLECTION = "mail";

function sanitizeString(value?: string | null, max = 500): string | undefined {
  if (!value) return undefined;
  const trimmed = value.toString().trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function validateEmail(email: string | undefined): string {
  const sanitized = sanitizeString(email, 255);
  if (!sanitized) {
    throw new SupportFeedbackError("Email is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new SupportFeedbackError("Enter a valid email address");
  }

  return sanitized.toLowerCase();
}

function ensureCategory(category?: FeedbackCategory): FeedbackCategory {
  if (!category) return DEFAULT_CATEGORY;
  if (CATEGORY_LABELS[category]) {
    return category;
  }
  throw new SupportFeedbackError("Unsupported feedback category");
}

function ensureUrgency(urgency?: FeedbackUrgency): FeedbackUrgency {
  if (!urgency) return DEFAULT_URGENCY;
  if (URGENCY_LABELS[urgency]) {
    return urgency;
  }
  throw new SupportFeedbackError("Unsupported urgency level");
}

function ensureMessage(message?: string): string {
  const sanitized = sanitizeString(message, 2000);
  if (!sanitized) {
    throw new SupportFeedbackError("Feedback message cannot be empty");
  }
  if (sanitized.length < 20) {
    throw new SupportFeedbackError(
      "Please include at least 20 characters so we can help"
    );
  }
  return sanitized;
}

function normalizePayload(payload: SupportFeedbackPayload): RequiredPayload {
  return {
    ...payload,
    email: validateEmail(payload.email),
    name: sanitizeString(payload.name, 80),
    pageContext: sanitizeString(payload.pageContext, 120),
    category: ensureCategory(payload.category),
    urgency: ensureUrgency(payload.urgency),
    message: ensureMessage(payload.message),
    allowContact: Boolean(payload.allowContact),
  };
}

/**
 * Send feedback by writing to Firestore `mail` collection.
 * Firebase Trigger Email extension watches this collection and sends emails.
 */
export async function sendSupportFeedback(
  payload: SupportFeedbackPayload,
  meta?: SupportFeedbackMeta
): Promise<SupportFeedbackResult> {
  const supportEmailTo = SUPPORT_EMAIL_TO();

  if (!supportEmailTo) {
    throw new SupportFeedbackError("Support email destination is not set", 500);
  }

  const normalized = normalizePayload(payload);
  const referenceId = `FB-${randomUUID().slice(0, 12)}`;

  if (DRY_RUN()) {
    logger.info(
      { normalized, meta, referenceId },
      "[SupportFeedback] Dry run submission"
    );
    return {
      success: true,
      referenceId,
      deliveredTo: supportEmailTo,
      simulated: true,
    };
  }

  try {
    const html = buildFeedbackEmailHtml(normalized, referenceId, meta);
    const text = buildFeedbackEmailText(normalized, referenceId, meta);

    await adminDb
      .collection(MAIL_COLLECTION)
      .doc(referenceId)
      .set({
        to: supportEmailTo,
        replyTo: normalized.email,
        message: {
          subject: `[Feedback] ${
            CATEGORY_LABELS[normalized.category]
          } (${referenceId})`,
          html,
          text,
        },
        feedback: {
          category: normalized.category,
          urgency: normalized.urgency,
          name: normalized.name || null,
          email: normalized.email,
          message: normalized.message,
          allowContact: normalized.allowContact,
          pageContext: normalized.pageContext || null,
        },
        meta: {
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
        },
        authenticatedUser: meta?.authenticatedUser || null,
        createdAt: new Date(),
      });

    logger.info({ referenceId }, "[SupportFeedback] Queued for delivery");

    return { success: true, referenceId, deliveredTo: supportEmailTo };
  } catch (error) {
    logger.error({ err: error }, "[SupportFeedback] Failed to queue feedback");
    throw new SupportFeedbackError(
      "We could not send your feedback right now. Please try again later.",
      502
    );
  }
}

export function getFeedbackOptions() {
  return {
    categories: FEEDBACK_CATEGORIES.map((item) => ({ ...item })),
    urgencyLevels: FEEDBACK_URGENCY.map((item) => ({ ...item })),
  };
}

export type {
  SupportFeedbackMeta,
  SupportFeedbackPayload,
  SupportFeedbackResult,
} from "@/types/supportFeedback";
