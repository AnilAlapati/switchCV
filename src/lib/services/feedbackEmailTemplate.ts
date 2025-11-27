import {
  CATEGORY_LABELS,
  URGENCY_LABELS,
  FeedbackCategory,
  FeedbackUrgency,
} from "@/config/supportFeedback";
import type { SupportFeedbackMeta } from "@/types/supportFeedback";

type FeedbackPayload = {
  email: string;
  message: string;
  category: FeedbackCategory;
  urgency: FeedbackUrgency;
  name?: string;
  allowContact?: boolean;
  pageContext?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds a modern, responsive HTML email template for feedback notifications
 */
export function buildFeedbackEmailHtml(
  payload: FeedbackPayload,
  referenceId: string,
  meta?: SupportFeedbackMeta
): string {
  const isAuthenticated = !!meta?.authenticatedUser;
  const categoryLabel = CATEGORY_LABELS[payload.category];
  const urgencyLabel = URGENCY_LABELS[payload.urgency];

  // Urgency colors
  const urgencyColors: Record<string, string> = {
    low: "#10B981", // green
    normal: "#3B82F6", // blue
    high: "#F59E0B", // amber
    critical: "#EF4444", // red
  };
  const urgencyColor = urgencyColors[payload.urgency] || "#3B82F6";

  // Category icons (emoji)
  const categoryIcons: Record<string, string> = {
    bug: "🐛",
    feature: "💡",
    question: "❓",
    general: "💬",
    other: "📝",
  };
  const categoryIcon = categoryIcons[payload.category] || "💬";

  const timestamp = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const userInitial = (payload.name || "A").charAt(0).toUpperCase();
  const userName = escapeHtml(payload.name || "Anonymous User");
  const userEmail = escapeHtml(payload.email);
  const canContactBadge = payload.allowContact
    ? '<span style="margin-left: 8px; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 10px; font-size: 11px;">Can contact</span>'
    : "";

  const authenticatedUserRow = meta?.authenticatedUser
    ? `<tr>
        <td style="padding: 4px 0; color: #6b7280;">User ID</td>
        <td style="padding: 4px 0; color: #374151; font-family: monospace; font-size: 12px;">${escapeHtml(
          meta.authenticatedUser.uid
        )}</td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                      ${categoryIcon} New Feedback
                    </h1>
                    <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
                      ${referenceId}
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="display: inline-block; background-color: ${urgencyColor}; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                      ${escapeHtml(urgencyLabel)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- From Section -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" style="vertical-align: top;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; text-align: center; line-height: 40px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      ${userInitial}
                    </div>
                  </td>
                  <td style="vertical-align: top; padding-left: 12px;">
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">
                      ${userName}
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 14px; color: #6b7280;">
                      <a href="mailto:${userEmail}" style="color: #667eea; text-decoration: none;">${userEmail}</a>
                      ${canContactBadge}
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 10px; border-radius: 6px; font-size: 12px;">
                      ${escapeHtml(categoryLabel)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Section -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">
                Message
              </p>
              <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(
                  payload.message
                )}</p>
              </div>
            </td>
          </tr>

          <!-- Details Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">
                      Details
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280; width: 120px;">Page</td>
                        <td style="padding: 4px 0; color: #374151;">${escapeHtml(
                          payload.pageContext || "Not specified"
                        )}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280;">Auth Status</td>
                        <td style="padding: 4px 0; color: #374151;">${
                          isAuthenticated ? "✓ Authenticated" : "Anonymous"
                        }</td>
                      </tr>
                      ${authenticatedUserRow}
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280;">IP Address</td>
                        <td style="padding: 4px 0; color: #374151; font-family: monospace; font-size: 12px;">${escapeHtml(
                          meta?.ipAddress || "Unknown"
                        )}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 12px; color: #9ca3af;">
                    SwitchCV Feedback System
                  </td>
                  <td align="right" style="font-size: 12px; color: #9ca3af;">
                    ${timestamp}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds a plain text version of the feedback email
 */
export function buildFeedbackEmailText(
  payload: FeedbackPayload,
  referenceId: string,
  meta?: SupportFeedbackMeta
): string {
  const categoryLabel = CATEGORY_LABELS[payload.category];
  const urgencyLabel = URGENCY_LABELS[payload.urgency];

  return `New Feedback Submitted
═══════════════════════════════════════

Reference: ${referenceId}
Category: ${categoryLabel}
Urgency: ${urgencyLabel}

From: ${payload.name || "Anonymous"} <${payload.email}>
Allow Contact: ${payload.allowContact ? "Yes" : "No"}
Page: ${payload.pageContext || "Not specified"}

───────────────────────────────────────
MESSAGE
───────────────────────────────────────

${payload.message}

───────────────────────────────────────
DETAILS
───────────────────────────────────────

Auth Status: ${meta?.authenticatedUser ? "Authenticated" : "Anonymous"}${
    meta?.authenticatedUser ? `\nUser ID: ${meta.authenticatedUser.uid}` : ""
  }
IP Address: ${meta?.ipAddress || "Unknown"}
User Agent: ${meta?.userAgent || "Unknown"}

═══════════════════════════════════════
SwitchCV Feedback System
`;
}
