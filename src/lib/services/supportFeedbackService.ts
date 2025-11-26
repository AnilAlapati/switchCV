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

export class SupportFeedbackError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SupportFeedbackError";
    this.statusCode = statusCode;
  }
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

/**
 * Collection name for Firebase Trigger Email extension
 * The extension watches this collection and sends emails automatically
 */
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function buildHtmlBody(
  payload: RequiredPayload,
  referenceId: string,
  meta?: SupportFeedbackMeta
) {
  const isAuthenticated = !!meta?.authenticatedUser;

  const rows = [
    ["Category", CATEGORY_LABELS[payload.category]],
    ["Urgency", URGENCY_LABELS[payload.urgency]],
    ["Name", payload.name || "Anonymous"],
    ["Email", payload.email],
    ["Allow Contact", payload.allowContact ? "Yes" : "No"],
    ["Page Context", payload.pageContext || "Browser"],
    ["Reference", referenceId],
    ["Authenticated", isAuthenticated ? "✓ Yes" : "✗ No (anonymous)"],
  ];

  // Add authenticated user info if present
  if (meta?.authenticatedUser) {
    rows.push(
      ["User ID", meta.authenticatedUser.uid],
      ["Account Email", meta.authenticatedUser.email || "N/A"],
      ["Display Name", meta.authenticatedUser.displayName || "N/A"]
    );
  }

  const metadataRows = [
    ["IP", meta?.ipAddress || "Unknown"],
    ["User Agent", meta?.userAgent || "Unknown"],
  ];

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin-bottom: 0.5rem;">New Feedback Received</h2>
      <p style="margin-top: 0; color: #4b5563;">Reference ID: ${referenceId}</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding: 6px 8px; background: #f8fafc; width: 160px; font-weight: 600;">${escapeHtml(
                    label
                  )}</td>
                  <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(
                    value
                  )}</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <h3 style="margin-bottom: 0.5rem;">Message</h3>
      <p style="padding: 12px; background: #f1f5f9; border-radius: 8px; white-space: pre-line;">${escapeHtml(
        payload.message
      )}</p>
      <h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">Request Metadata</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          ${metadataRows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding: 6px 8px; background: #f8fafc; width: 160px; font-weight: 600;">${escapeHtml(
                    label
                  )}</td>
                  <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(
                    value
                  )}</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function normalizePayload(payload: SupportFeedbackPayload): RequiredPayload {
  const email = validateEmail(payload.email);
  const name = sanitizeString(payload.name, 80);
  const pageContext = sanitizeString(payload.pageContext, 120);
  const category = ensureCategory(payload.category);
  const urgency = ensureUrgency(payload.urgency);
  const message = ensureMessage(payload.message);

  return {
    ...payload,
    email,
    name,
    pageContext,
    category,
    urgency,
    message,
    allowContact: Boolean(payload.allowContact),
  };
}

/**
 * Send feedback by writing to Firestore `mail` collection.
 * Firebase Trigger Email extension watches this collection and sends emails automatically.
 *
 * @see https://firebase.google.com/products/extensions/firebase-firestore-send-email
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
    const html = buildHtmlBody(normalized, referenceId, meta);
    const text = `New feedback submitted\n\nReference: ${referenceId}\nCategory: ${
      CATEGORY_LABELS[normalized.category]
    }\nUrgency: ${URGENCY_LABELS[normalized.urgency]}\nAllow Contact: ${
      normalized.allowContact ? "Yes" : "No"
    }\nPage: ${normalized.pageContext || "Browser"}\n\nMessage:\n${
      normalized.message
    }\n\nMetadata:\nIP: ${meta?.ipAddress || "Unknown"}\nUser Agent: ${
      meta?.userAgent || "Unknown"
    }`;

    // Write to Firestore `mail` collection - Firebase Trigger Email extension picks this up
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
        // Store feedback data for reference/analytics
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
        // Authenticated user info (null if anonymous submission)
        authenticatedUser: meta?.authenticatedUser || null,
        createdAt: new Date(),
      });

    logger.info({ referenceId }, "[SupportFeedback] Queued for delivery");

    return {
      success: true,
      referenceId,
      deliveredTo: supportEmailTo,
    };
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
