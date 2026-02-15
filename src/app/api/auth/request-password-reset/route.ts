import { NextRequest, NextResponse } from "next/server";
import {
  COLLECTIONS,
  collectionRef,
  getAuthUserByEmail,
  serverTimestamp,
  timestampFromDate,
} from "@/lib/dal";
import { handleApiError } from "@/lib/utils/api-helpers";
import { randomBytes, createHash } from "crypto";
import { RequestPasswordResetSchema } from "@/lib/schemas/api";
import { checkRateLimit } from "@/lib/utils/rateLimit";

/**
 * Request password reset - generates token and sends email via Firestore extension
 * This ensures ALL emails use the same Gmail SMTP process
 */
export async function POST(request: NextRequest) {
  try {
    // Strict rate limit for password reset requests (5 per 15 min)
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await checkRateLimit(`request-password-reset:${ip}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const parseResult = RequestPasswordResetSchema.safeParse(
      await request.json()
    );
    if (!parseResult.success) {
      return handleApiError(
        parseResult.error,
        "Email is required",
        400
      );
    }
    const { email } = parseResult.data;

    // Check if user exists
    let user;
    try {
      user = await getAuthUserByEmail(email);
    } catch {
      // For security, don't reveal if email exists or not
      // Return success even if user doesn't exist
      return NextResponse.json({
        success: true,
        message: "If an account exists, a password reset email has been sent.",
      });
    }

    // Generate secure reset token
    const resetToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    // Store only the hash — never persist the raw token
    await collectionRef(COLLECTIONS.PASSWORD_RESET_TOKENS).add({
      tokenHash,
      userId: user.uid,
      email: email,
      used: false,
      createdAt: serverTimestamp(),
      expiresAt: timestampFromDate(expiresAt),
    });

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/auth/reset-password?token=${resetToken}`;

    // Queue email via Firestore extension (same process as all other emails)
    await collectionRef(COLLECTIONS.MAIL).add({
      to: email,
      from: "SwitchCV <switchcvs@gmail.com>",
      replyTo: "switchcvs@gmail.com",
      message: {
        subject: "Reset Your SwitchCV Password",
        text: `Click the link below to reset your password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; margin: 0;">SwitchCV</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                We received a request to reset your SwitchCV password. Click the button below to set a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                This link will expire in 1 hour for security reasons.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>This email was sent from SwitchCV</p>
              <p>Need help? Contact us at switchcvs@gmail.com</p>
            </div>
          </div>
        `,
      },
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a password reset email has been sent.",
    });
  } catch (error) {
    return handleApiError(error, "Failed to process password reset request");
  }
}
