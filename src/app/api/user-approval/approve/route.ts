/**
 * Public API endpoint for approving user registrations via token
 *
 * GET  /api/user-approval/approve?token=SECURE_TOKEN → Confirmation page
 * POST /api/user-approval/approve (token in body)    → Performs the approval
 *
 * SECURITY: GET no longer mutates state. The actual approval happens on POST,
 * preventing email scanners and link-preview bots from triggering approvals.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import {
  validateApprovalToken,
  parseApprovalToken,
} from "@/lib/utils/approval-tokens";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

// ── Private helpers ─────────────────────────────────────────────────────────

/** Sends approval notification email and returns the success page for a Google/OAuth user. */
async function approveOAuthUser(
  userId: string,
  userEmail: string,
  requestId: string,
  baseUrl: string,
): Promise<NextResponse> {
  await adminDb.collection("mail").add({
    to: userEmail,
    message: {
      subject: "Your SwitchCV Account is Approved! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f172a; margin: 0;">Welcome to SwitchCV! 🎉</h1>
            </div>
            <p>Great news! Your registration has been approved.</p>
            <p>You signed up with Google, so no further verification is needed. Simply sign in to get started:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/auth"
                 style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Sign In to SwitchCV
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">SwitchCV - Connect with the right opportunities</p>
          </body>
        </html>
      `,
      text: `Welcome to SwitchCV!\n\nGreat news! Your registration has been approved.\n\nYou signed up with Google, so no further verification is needed. Sign in at: ${baseUrl}/auth`,
    },
  });

  logger.info(
    { userId, requestId, isOAuthUser: true },
    "OAuth user approved successfully",
  );

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>User Approved</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
          h1 { color: #10b981; }
          .email { color: #3b82f6; font-weight: 500; }
        </style>
      </head>
      <body>
        <h1>✅ User Approved Successfully</h1>
        <p>Google account <span class="email">${userEmail}</span> has been approved.</p>
        <p style="color: #64748b; font-size: 14px;">An approval notification has been sent. The user can sign in immediately.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">You can close this window now.</p>
      </body>
    </html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

/** Generates a Firebase email-verification link and sends it to an email/password user, then returns the success page. */
async function approvePasswordUser(
  userId: string,
  userEmail: string,
  requestId: string,
  baseUrl: string,
): Promise<NextResponse> {
  const actionCodeSettings = {
    url: baseUrl,
    handleCodeInApp: false,
  };

  let verificationUrl: string;
  try {
    verificationUrl = await adminAuth.generateEmailVerificationLink(
      userEmail,
      actionCodeSettings,
    );
    logger.info(
      { userId, email: userEmail, baseUrl },
      "Generated Firebase verification link",
    );
  } catch (error) {
    logger.error(
      { error, userId, email: userEmail },
      "Failed to generate verification link",
    );
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>User Approved</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
            h1 { color: #10b981; }
            .email { color: #3b82f6; font-weight: 500; }
          </style>
        </head>
        <body>
          <h1>⚠️ User Approved</h1>
          <p>User <span class="email">${userEmail}</span> was approved, but verification email generation failed.</p>
          <p style="color: #64748b; font-size: 14px;">The account remains unverified. Ask the user to use "Resend verification email" later.</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">You can close this window now.</p>
        </body>
      </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  }

  // Send verification email to password user
  await adminDb.collection("mail").add({
    to: userEmail,
    message: {
      subject: "Verify Your SwitchCV Account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f172a; margin: 0;">Welcome to SwitchCV! 🎉</h1>
            </div>
            <p>Great news! Your registration has been approved.</p>
            <p>Please verify your email address to complete your account setup:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">
              This link will expire in 24 hours. If you didn't request this, please ignore this email.
            </p>
            <p style="color: #64748b; font-size: 14px;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">SwitchCV - Connect with the right opportunities</p>
          </body>
        </html>
      `,
      text: `Welcome to SwitchCV!\n\nGreat news! Your registration has been approved.\n\nPlease verify your email address by clicking this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this, please ignore this email.`,
    },
  });

  logger.info(
    { userId, requestId, isOAuthUser: false },
    "Email/password user approved successfully",
  );

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>User Approved</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
          h1 { color: #10b981; }
          .email { color: #3b82f6; font-weight: 500; }
        </style>
      </head>
      <body>
        <h1>✅ User Approved Successfully</h1>
        <p>Verification email has been sent to <span class="email">${userEmail}</span></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">You can close this window now.</p>
      </body>
    </html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** Shared rate-limit + token validation. Returns parsed data or an HTML error response. */
async function validateRequest(token: string | null, ip: string) {
  const rateLimitResult = await checkDistributedRateLimit(ip, {
    scope: "user-approval",
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return {
      error: new NextResponse("Too many requests. Please try again later.", {
        status: 429,
      }),
    };
  }

  if (!token) {
    return {
      error: new NextResponse(
        `<!DOCTYPE html><html><head><title>Invalid Request</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#dc2626}</style></head><body><h1>❌ Invalid Request</h1><p>No approval token provided.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      ),
    };
  }

  const parsed = parseApprovalToken(token);
  if (!parsed || parsed.action !== "approve") {
    logger.warn("Invalid token format or wrong action");
    return {
      error: new NextResponse(
        `<!DOCTYPE html><html><head><title>Invalid Token</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#dc2626}</style></head><body><h1>❌ Invalid Token</h1><p>This approval link is invalid or malformed.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      ),
    };
  }

  const { requestId } = parsed;
  const requestRef = adminDb.collection("userApprovalRequests").doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    logger.warn({ requestId }, "Approval request not found");
    return {
      error: new NextResponse(
        `<!DOCTYPE html><html><head><title>Request Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#dc2626}</style></head><body><h1>❌ Request Not Found</h1><p>This approval request does not exist or has been deleted.</p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } },
      ),
    };
  }

  const requestData = requestDoc.data()!;

  if (requestData.status !== "pending") {
    return {
      error: new NextResponse(
        `<!DOCTYPE html><html><head><title>Already Processed</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#f59e0b}</style></head><body><h1>⚠️ Already Processed</h1><p>This user has already been ${requestData.status}.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      ),
    };
  }

  const isValid = validateApprovalToken(
    token,
    requestData.approveTokenHash,
    requestData.approveTokenExpiresAt.toDate(),
  );

  if (!isValid) {
    logger.warn({ requestId }, "Invalid or expired token");
    return {
      error: new NextResponse(
        `<!DOCTYPE html><html><head><title>Invalid or Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#dc2626}</style></head><body><h1>❌ Invalid or Expired</h1><p>This approval link is invalid or has expired.</p><p style="color:#64748b;font-size:14px">Approval links expire after 7 days.</p></body></html>`,
        { status: 403, headers: { "Content-Type": "text/html" } },
      ),
    };
  }

  return { requestId, requestRef, requestData, token };
}

/**
 * GET /api/user-approval/approve?token=SECURE_TOKEN
 * SECURITY FIX: GET now only shows a confirmation page — no state mutation.
 * This prevents email scanners and link-preview bots from auto-approving users.
 */
export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const token = request.nextUrl.searchParams.get("token");

  try {
    const result = await validateRequest(token, ip);
    if ("error" in result) return result.error;

    const { requestData } = result;

    // Show confirmation page with a POST form — no mutation happens here
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Confirm Approval</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
            h1 { color: #3b82f6; }
            .email { color: #3b82f6; font-weight: 500; }
            button { background: #10b981; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 20px; }
            button:hover { background: #059669; }
            button:disabled { background: #9ca3af; cursor: not-allowed; }
          </style>
        </head>
        <body>
          <h1>Confirm User Approval</h1>
          <p>You are about to approve <span class="email">${requestData.email}</span></p>
          <p style="color: #64748b; font-size: 14px;">Click the button below to confirm.</p>
          <form method="POST" action="/api/user-approval/approve" onsubmit="this.querySelector('button').disabled=true;this.querySelector('button').textContent='Processing...'">
            <input type="hidden" name="token" value="${token}" />
            <button type="submit">✅ Approve User</button>
          </form>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    logger.error({ error }, "Error rendering approval confirmation");
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Error</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#dc2626}</style></head><body><h1>❌ Error</h1><p>An error occurred. Please try again or contact support.</p></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
      },
    );
  }
}

/**
 * POST /api/user-approval/approve
 * Performs the actual approval mutation. Token submitted via form body.
 */
export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

  // Parse form-encoded body
  let token: string | null = null;
  try {
    const formData = await request.formData();
    token = formData.get("token") as string | null;
  } catch {
    return new NextResponse("Invalid request body", { status: 400 });
  }

  try {
    const result = await validateRequest(token, ip);
    if ("error" in result) return result.error;

    const { requestRef, requestData } = result;

    const userId = requestData.userId;
    const userEmail = requestData.email;

    // Detect whether this is a Google/OAuth user
    let isOAuthUser = false;
    try {
      const authUser = await adminAuth.getUser(userId);
      isOAuthUser = authUser.providerData.some(
        (p) => p.providerId !== "password",
      );
      logger.info(
        {
          userId,
          isOAuthUser,
          providers: authUser.providerData.map((p) => p.providerId),
        },
        "Detected user provider type for approval",
      );
    } catch (err) {
      logger.warn(
        { err, userId },
        "Could not fetch auth user to detect provider; defaulting to email/password flow",
      );
    }

    // Update user document - mark as approved
    await adminDb
      .collection("users")
      .doc(userId)
      .update({
        ...(isOAuthUser ? {} : { emailVerified: false }),
        approvalStatus: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      });

    // Update approval request
    await requestRef.update({
      status: "approved",
      processedAt: new Date(),
      updatedAt: new Date(),
    });

    const baseUrl =
      process.env.WEBSITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://switchcv.com";

    if (isOAuthUser) {
      return approveOAuthUser(userId, userEmail, result.requestId, baseUrl);
    }
    return approvePasswordUser(userId, userEmail, result.requestId, baseUrl);
  } catch (error) {
    logger.error({ error }, "Error approving user");
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Error</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:100px auto;padding:20px;text-align:center}h1{color:#dc2626}</style></head><body><h1>❌ Error</h1><p>An error occurred while processing the approval. Please try again or contact support.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    );
  }
}
