/**
 * Public API endpoint for declining user registrations via token
 *
 * GET /api/user-approval/decline?token=SECURE_TOKEN
 *
 * This endpoint is public and requires no authentication.
 * Security is provided by the one-time use token.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import {
  validateApprovalToken,
  parseApprovalToken,
} from "@/lib/utils/approval-tokens";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Invalid Request</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
            h1 { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>❌ Invalid Request</h1>
          <p>No decline token provided.</p>
        </body>
      </html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  try {
    // Parse token to extract requestId
    const parsed = parseApprovalToken(token);
    if (!parsed || parsed.action !== "decline") {
      logger.warn("Invalid token format or wrong action");
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Token</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
              h1 { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1>❌ Invalid Token</h1>
            <p>This decline link is invalid or malformed.</p>
          </body>
        </html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      );
    }

    const { requestId } = parsed;

    // Get the approval request
    const requestRef = adminDb
      .collection("userApprovalRequests")
      .doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      logger.warn({ requestId }, "Approval request not found");
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Request Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
              h1 { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1>❌ Request Not Found</h1>
            <p>This decline request does not exist or has been deleted.</p>
          </body>
        </html>`,
        { status: 404, headers: { "Content-Type": "text/html" } },
      );
    }

    const requestData = requestDoc.data()!;

    // Check if already processed
    if (requestData.status !== "pending") {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Already Processed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
              h1 { color: #f59e0b; }
            </style>
          </head>
          <body>
            <h1>⚠️ Already Processed</h1>
            <p>This user has already been ${requestData.status}.</p>
          </body>
        </html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      );
    }

    // Validate the token
    const isValid = validateApprovalToken(
      token,
      requestData.declineTokenHash,
      requestData.declineTokenExpiresAt.toDate(),
    );

    if (!isValid) {
      logger.warn({ requestId }, "Invalid or expired token");
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Invalid or Expired</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
              h1 { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1>❌ Invalid or Expired</h1>
            <p>This decline link is invalid or has expired.</p>
            <p style="color: #64748b; font-size: 14px;">Decline links expire after 7 days.</p>
          </body>
        </html>`,
        { status: 403, headers: { "Content-Type": "text/html" } },
      );
    }

    // Token is valid - proceed with decline
    const userId = requestData.userId;
    const userEmail = requestData.email;

    // Get decline reason from system config in Firestore
    let declineReason =
      "We appreciate your interest in SwitchCV. Unfortunately, we are unable to approve your registration at this time. Please contact support@switchcv.com for more information.";

    try {
      const configDoc = await adminDb.collection("config").doc("system").get();
      if (configDoc.exists) {
        const configData = configDoc.data();
        declineReason =
          configData?.userApproval?.declineReason || declineReason;
      }
    } catch (error) {
      logger.warn(
        { error },
        "Failed to fetch decline reason from config, using default",
      );
    }

    // Disable the Firebase Auth account
    await adminAuth.updateUser(userId, {
      disabled: true,
    });

    // Update user document
    await adminDb.collection("users").doc(userId).update({
      approvalStatus: "declined",
      accountDisabled: true,
      updatedAt: new Date(),
    });

    // Update approval request
    await requestRef.update({
      status: "declined",
      processedAt: new Date(),
      updatedAt: new Date(),
    });

    // Send decline notification email
    await adminDb.collection("mail").add({
      to: userEmail,
      message: {
        subject: "SwitchCV Registration Update",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0f172a; margin: 0;">SwitchCV Registration Status</h1>
              </div>
              
              <p>${declineReason}</p>
              
              <p>If you have any questions or believe this is an error, please don't hesitate to reach out to our support team.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:support@switchcv.com" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Contact Support
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                SwitchCV - Connect with the right opportunities
              </p>
            </body>
          </html>
        `,
        text: `SwitchCV Registration Status\n\n${declineReason}\n\nIf you have any questions or believe this is an error, please contact our support team at support@switchcv.com.`,
      },
    });

    logger.info({ userId, requestId }, "User declined successfully");

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>User Declined</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
            h1 { color: #f59e0b; }
            .email { color: #3b82f6; font-weight: 500; }
          </style>
        </head>
        <body>
          <h1>✅ User Declined</h1>
          <p>Notification email has been sent to <span class="email">${userEmail}</span></p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            You can close this window now.
          </p>
        </body>
      </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  } catch (error) {
    logger.error({ error }, "Error declining user");
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
            h1 { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>❌ Error</h1>
          <p>An error occurred while processing the decline. Please try again or contact support.</p>
        </body>
      </html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    );
  }
}
