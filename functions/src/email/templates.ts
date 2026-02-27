/**
 * Email HTML/text template builders.
 * Each function returns a string — no side effects, no I/O.
 */
import * as admin from "firebase-admin";
import { config } from "../config";

// ── Admin approval email ────────────────────────────────────────────────────

export function buildAdminApprovalEmailHtml(
  user: admin.auth.UserRecord,
  userData: admin.firestore.DocumentData | undefined,
  approveUrl: string,
  declineUrl: string,
  _websiteUrl: string,
): string {
  const firstName = userData?.firstName || user.displayName || "New User";
  const email = user.email || "No email provided";
  const username = userData?.username || "Not set";
  const createdAt = new Date().toISOString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1A2F25; margin-bottom: 24px;">🔔 New User Registration Approval</h1>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
      A new user has registered and requires your approval.
    </p>
    
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #1A2F25; margin-top: 0; margin-bottom: 16px;">User Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6B7280; padding: 8px 0; width: 120px;">Name:</td>
          <td style="color: #1F2937; padding: 8px 0; font-weight: 500;">${firstName}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 8px 0;">Email:</td>
          <td style="color: #1F2937; padding: 8px 0; font-weight: 500;">${email}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 8px 0;">Username:</td>
          <td style="color: #1F2937; padding: 8px 0; font-weight: 500;">${username}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 8px 0;">User ID:</td>
          <td style="color: #1F2937; padding: 8px 0; font-family: monospace; font-size: 12px;">${user.uid}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 8px 0;">Registered:</td>
          <td style="color: #1F2937; padding: 8px 0;">${createdAt}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${approveUrl}" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 12px;">
        ✓ Approve User
      </a>
      <a href="${declineUrl}" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        ✗ Decline
      </a>
    </div>

    <p style="color: #6B7280; font-size: 14px; text-align: center;">
      Click the button above to approve or decline this registration.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      This is an automated notification from SwitchCV User Approval System.
    </p>
  </div>
</body>
</html>`;
}

export function buildAdminApprovalEmailText(
  user: admin.auth.UserRecord,
  userData: admin.firestore.DocumentData | undefined,
  approveUrl: string,
  declineUrl: string,
  _websiteUrl: string,
): string {
  const firstName = userData?.firstName || user.displayName || "New User";
  const email = user.email || "No email provided";
  const username = userData?.username || "Not set";
  const createdAt = new Date().toISOString();

  return `NEW USER REGISTRATION APPROVAL

A new user has registered and requires your approval.

USER INFORMATION
----------------
Name: ${firstName}
Email: ${email}
Username: ${username}
User ID: ${user.uid}
Registered: ${createdAt}

ACTIONS
-------
Approve User: ${approveUrl}
Decline User: ${declineUrl}

---
This is an automated notification from SwitchCV User Approval System.`;
}

// ── Welcome / verification email ────────────────────────────────────────────

export function buildWelcomeEmailHtml(
  firstName: string,
  verificationUrl: string,
  websiteUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1A2F25; margin-bottom: 24px;">Welcome to SwitchCV!</h1>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
      Thank you for joining SwitchCV. We're excited to help you showcase your skills and connect with opportunities.
    </p>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Please verify your email address to get started:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #D4A853 0%, #C4973F 100%); color: #1A2F25; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Verify Email
      </a>
    </div>
    <p style="color: #4a5568; font-size: 14px; line-height: 1.6;"><strong>Here's what you can do next:</strong></p>
    <ul style="color: #4a5568; font-size: 14px; line-height: 1.8;">
      <li>Create your professional profile</li>
      <li>Upload and manage your resumes</li>
      <li>View profile analytics and recruiter interest</li>
      <li>Control access to your information</li>
    </ul>
    <p style="margin-top: 24px;">
      <a href="${websiteUrl}/dashboard" style="color: #D4A853; text-decoration: none;">Go to Dashboard →</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
    <p style="color: #a0aec0; font-size: 12px;">
      If you didn't create an account with SwitchCV, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

export function buildWelcomeEmailText(
  firstName: string,
  verificationUrl: string,
  websiteUrl: string,
): string {
  return `Welcome to SwitchCV!

Hi ${firstName},

Thank you for joining SwitchCV. We're excited to help you showcase your skills and connect with opportunities.

Please verify your email address to get started:
${verificationUrl}

Here's what you can do next:
- Create your professional profile
- Upload and manage your resumes
- View profile analytics and recruiter interest
- Control access to your information

Go to Dashboard: ${websiteUrl}/dashboard

If you didn't create an account with SwitchCV, you can safely ignore this email.`;
}

// ── Pending approval notification ───────────────────────────────────────────

export function buildPendingApprovalEmailHtml(
  firstName: string,
  _websiteUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1A2F25; margin-bottom: 24px;">📬 Registration Received!</h1>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
      Thank you for registering with SwitchCV! We've received your application.
    </p>
    
    <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #1E40AF; font-size: 14px; margin: 0; line-height: 1.6;">
        <strong>What happens next?</strong><br>
        Our team will review your registration shortly. Once approved, you'll receive an email with instructions to verify your account and get started.
      </p>
    </div>

    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
      We're carefully managing our user base to ensure the best experience for everyone. 
      This review process typically takes less than 24 hours.
    </p>

    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
      While you wait, feel free to explore what SwitchCV has to offer:
    </p>
    <ul style="color: #4a5568; font-size: 14px; line-height: 1.8;">
      <li>AI-powered resume creation and optimization</li>
      <li>Professional profile management</li>
      <li>Direct connections with recruiters</li>
      <li>Comprehensive analytics dashboard</li>
    </ul>

    <p style="color: #6B7280; font-size: 14px; margin-top: 24px;">
      If you have any questions, feel free to reach out to us at 
      <a href="mailto:${config.get("email").supportEmail}" style="color: #3B82F6;">${config.get("email").supportEmail}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      Thank you for your patience!<br>
      The SwitchCV Team
    </p>
  </div>
</body>
</html>`;
}

export function buildPendingApprovalEmailText(
  firstName: string,
  _websiteUrl: string,
): string {
  return `REGISTRATION RECEIVED!

Hi ${firstName},

Thank you for registering with SwitchCV! We've received your application.

WHAT HAPPENS NEXT?
Our team will review your registration shortly. Once approved, you'll receive an email with instructions to verify your account and get started.

We're carefully managing our user base to ensure the best experience for everyone. This review process typically takes less than 24 hours.

While you wait, here's what SwitchCV offers:
- AI-powered resume creation and optimization
- Professional profile management
- Direct connections with recruiters
- Comprehensive analytics dashboard

If you have any questions, feel free to reach out to us at ${config.get("email").supportEmail}.

Thank you for your patience!
The SwitchCV Team`;
}
