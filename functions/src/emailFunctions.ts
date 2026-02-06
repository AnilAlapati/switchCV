import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { randomUUID, createHash, randomBytes } from "crypto";
import { emailService } from "./services/emailService";
import { auditLogger, AuditAction, ResourceType } from "./services/auditLogger";

const defaultVerificationPath =
  process.env.VERIFICATION_PATH ||
  process.env.NEXT_PUBLIC_AUTH_VERIFICATION_PATH ||
  "/auth?mode=verify-email";

const normalizeBase = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const buildVerificationLink = (): string => {
  const explicitLink =
    process.env.AUTH_VERIFICATION_URL || process.env.EMAIL_VERIFICATION_URL;
  if (explicitLink) {
    return explicitLink;
  }

  const baseUrl = normalizeBase(
    process.env.WEBSITE_URL || "https://switchcv.com",
  );
  const path = defaultVerificationPath.startsWith("/")
    ? defaultVerificationPath
    : `/${defaultVerificationPath}`;
  return `${baseUrl}${path}`;
};

const generateCustomVerificationToken = async (
  userId: string,
): Promise<string> => {
  const token = randomUUID();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000,
  ); // 24h

  // Store token
  await admin.firestore().collection("verificationTokens").add({
    userId,
    token,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    used: false,
  });

  const baseUrl = normalizeBase(
    process.env.WEBSITE_URL || "https://switchcv.com",
  );
  return `${baseUrl}/api/auth/verify?token=${token}`;
};

/**
 * Fetches user approval configuration from Firestore
 */
async function getUserApprovalConfig(): Promise<{
  enabled: boolean;
  adminEmail: string;
  autoApproveDomains: string[];
}> {
  try {
    const configDoc = await admin
      .firestore()
      .collection("config")
      .doc("system")
      .get();

    if (configDoc.exists) {
      const config = configDoc.data()?.userApproval;
      return {
        enabled: config?.enabled ?? true,
        adminEmail: config?.adminEmail || "support@switchcv.com",
        autoApproveDomains: config?.autoApproveDomains || [],
      };
    }
  } catch (error) {
    console.warn(
      "Failed to fetch user approval config, using defaults:",
      error,
    );
  }

  return {
    enabled: true,
    adminEmail: "support@switchcv.com",
    autoApproveDomains: [],
  };
}

/**
 * Checks if an email domain should be auto-approved
 */
function shouldAutoApprove(
  email: string,
  autoApproveDomains: string[],
): boolean {
  if (!email || autoApproveDomains.length === 0) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return autoApproveDomains.some((d) => d.toLowerCase() === domain);
}

/**
 * Generate a secure approval token
 */
function generateApprovalToken(
  action: "approve" | "decline",
  requestId: string,
): { token: string; hash: string; expiresAt: admin.firestore.Timestamp } {
  // Generate 32 bytes of random data (256 bits)
  const randomData = randomBytes(32).toString("hex");

  // Combine with action and requestId for uniqueness
  const token = `${action}_${requestId}_${randomData}`;

  // Create SHA256 hash for storage
  const hash = createHash("sha256").update(token).digest("hex");

  // Token expires in 7 days
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  return { token, hash, expiresAt };
}

/**
 * Builds HTML email content for admin approval request
 */
function buildAdminApprovalEmailHtml(
  user: admin.auth.UserRecord,
  userData: admin.firestore.DocumentData | undefined,
  approveUrl: string,
  declineUrl: string,
  websiteUrl: string,
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

/**
 * Builds plain text email content for admin approval request
 */
function buildAdminApprovalEmailText(
  user: admin.auth.UserRecord,
  userData: admin.firestore.DocumentData | undefined,
  approveUrl: string,
  declineUrl: string,
  websiteUrl: string,
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

// ==================== EMAIL FUNCTIONS ====================

// ==================== HANDLERS ====================

const onUserCreatedHandler = async (user: admin.auth.UserRecord) => {
  try {
    // Wait briefly for frontend to create user doc (race condition)
    let userDoc: admin.firestore.DocumentSnapshot | null = null;
    const userRef = admin.firestore().collection("users").doc(user.uid);

    for (let i = 0; i < 3; i++) {
      userDoc = await userRef.get();
      if (userDoc.exists) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const userData = userDoc?.exists ? userDoc.data() : undefined;

    // Check if manual user approval is enabled
    const approvalConfig = await getUserApprovalConfig();
    const websiteUrl = process.env.WEBSITE_URL || "https://switchcv.com";

    // Check for auto-approve domains
    const isAutoApproved = user.email
      ? shouldAutoApprove(user.email, approvalConfig.autoApproveDomains)
      : false;

    if (approvalConfig.enabled && !isAutoApproved) {
      // Manual approval mode: Send approval request to admin instead of verification email to user
      console.log(
        `User approval enabled - sending approval request to admin for ${user.email}`,
      );

      // Create approval request document first to get the ID
      const approvalRequestRef = admin
        .firestore()
        .collection("userApprovalRequests")
        .doc();

      const requestId = approvalRequestRef.id;

      // Generate secure tokens for approve/decline actions
      const approveToken = generateApprovalToken("approve", requestId);
      const declineToken = generateApprovalToken("decline", requestId);

      // Store the approval request with token hashes
      await approvalRequestRef.set({
        userId: user.uid,
        email: user.email || null,
        firstName: userData?.firstName || user.displayName || null,
        username: userData?.username || null,
        status: "pending",
        approveTokenHash: approveToken.hash,
        approveTokenExpiresAt: approveToken.expiresAt,
        declineTokenHash: declineToken.hash,
        declineTokenExpiresAt: declineToken.expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: null,
        processedBy: null,
      });

      // Update user document with approval status
      await admin.firestore().collection("users").doc(user.uid).update({
        approvalStatus: "pending",
        approvalRequestId: requestId,
      });

      // Generate approval/decline URLs with secure tokens
      const approveUrl = `${websiteUrl}/api/user-approval/approve?token=${approveToken.token}`;
      const declineUrl = `${websiteUrl}/api/user-approval/decline?token=${declineToken.token}`;

      // Send approval request email to admin
      await admin
        .firestore()
        .collection("mail")
        .add({
          to: approvalConfig.adminEmail,
          message: {
            subject: `New User Registration Approval - ${user.email}`,
            html: buildAdminApprovalEmailHtml(
              user,
              userData,
              approveUrl,
              declineUrl,
              websiteUrl,
            ),
            text: buildAdminApprovalEmailText(
              user,
              userData,
              approveUrl,
              declineUrl,
              websiteUrl,
            ),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Send "pending approval" notification to user
      const firstName = userData?.firstName || user.displayName || "User";
      await admin
        .firestore()
        .collection("mail")
        .add({
          to: user.email,
          message: {
            subject: "SwitchCV - Registration Received",
            html: buildPendingApprovalEmailHtml(firstName, websiteUrl),
            text: buildPendingApprovalEmailText(firstName, websiteUrl),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      await auditLogger.log({
        userId: user.uid,
        action: AuditAction.EMAIL_SENT,
        resourceType: ResourceType.EMAIL,
        resourceId: user.email || "",
        details: "User approval request sent to admin",
        status: "success",
      });

      console.log(
        `Approval request sent to ${approvalConfig.adminEmail} for user ${user.email}`,
      );
      return;
    }

    // Auto-approved or approval disabled: Send verification email directly
    if (isAutoApproved) {
      console.log(`User ${user.email} auto-approved due to domain whitelist`);
      await admin.firestore().collection("users").doc(user.uid).update({
        approvalStatus: "approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvalNote: "Auto-approved: domain whitelist",
      });
    }

    // Generate email verification link with improved error handling
    let verificationLink = buildVerificationLink();
    let verificationMethod = "static";

    if (user.email) {
      // Try custom token first (more reliable than Firebase's rate-limited API)
      try {
        verificationLink = await generateCustomVerificationToken(user.uid);
        verificationMethod = "custom_token";
        console.log(`Generated custom verification token for ${user.email}`);
      } catch (customTokenError) {
        console.warn(
          "Custom token generation failed, trying Firebase API:",
          customTokenError,
        );

        // Fallback to Firebase's built-in verification link
        try {
          const actionCodeSettings = {
            url: `${process.env.WEBSITE_URL || "https://switchcv.com"
              }/dashboard`,
            handleCodeInApp: false,
          };
          verificationLink = await admin
            .auth()
            .generateEmailVerificationLink(user.email, actionCodeSettings);
          verificationMethod = "firebase_with_redirect";
          console.log(`Generated Firebase verification link for ${user.email}`);
        } catch (e) {
          const firebaseError = e as { code?: string; message?: string };

          // Check if it's a rate limit error
          if (firebaseError.message?.includes("TOO_MANY_ATTEMPTS")) {
            console.warn(
              "Firebase rate limit hit, will use custom token on next signup",
            );
            // Keep the static link as fallback
            verificationMethod = "static_fallback";
          } else {
            console.warn("Error generating Firebase verification link:", e);
          }
        }
      }
    }

    const firstName = userData?.firstName || user.displayName || "User";

    // Use Firebase Trigger Email Extension (same as feedback emails)
    await admin
      .firestore()
      .collection("mail")
      .add({
        to: user.email,
        message: {
          subject: "Welcome to SwitchCV - Verify Your Email",
          html: buildWelcomeEmailHtml(firstName, verificationLink, websiteUrl),
          text: buildWelcomeEmailText(firstName, verificationLink, websiteUrl),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await auditLogger.logEmailSent(
      user.uid,
      user.email || "",
      "welcomeEmail",
      true,
    );

    console.log(
      `Welcome email sent to ${user.email} with verification method: ${verificationMethod}`,
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
    await auditLogger.log({
      userId: user.uid,
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.EMAIL,
      resourceId: user.email || "",
      details: `Welcome email failed: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      status: "failure",
    });
  }
};

// Helper functions for email templates
function buildWelcomeEmailHtml(
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

function buildWelcomeEmailText(
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

/**
 * Builds HTML email content for pending approval notification to user
 */
function buildPendingApprovalEmailHtml(
  firstName: string,
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
      <a href="mailto:support@switchcv.com" style="color: #3B82F6;">support@switchcv.com</a>
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

/**
 * Builds plain text email content for pending approval notification to user
 */
function buildPendingApprovalEmailText(
  firstName: string,
  websiteUrl: string,
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

If you have any questions, feel free to reach out to us at support@switchcv.com.

Thank you for your patience!
The SwitchCV Team`;
}

const onRecruiterRequestCreatedHandler = async (
  snap: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext,
) => {
  try {
    const request = snap.data();
    const toUserId = request.toUserId;
    const candidateDoc = await admin
      .firestore()
      .collection("users")
      .doc(toUserId)
      .get();
    const candidateEmail = candidateDoc.data()?.email;

    if (!candidateEmail) {
      throw new Error("Candidate email not found");
    }

    const recruiterDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.fromRecruiter.recruiterId)
      .get();
    const recruiterName = recruiterDoc.data()?.companyName || "A Recruiter";

    const result = await emailService.sendEmail({
      to: candidateEmail,
      template: "recruiterRequest" as any,
      data: {
        companyName: request.fromRecruiter.companyName || recruiterName,
        position: request.position || "Not specified",
        message: request.message || "",
        dashboardUrl: `${process.env.WEBSITE_URL}/dashboard`,
      },
    });

    if (result.success) {
      await auditLogger.logRecruiterRequest(
        context.params.requestId,
        request.fromRecruiter.recruiterId,
        toUserId,
        AuditAction.RECRUITER_REQUEST_CREATED,
      );
    }
  } catch (error) {
    console.error("Error sending recruiter request email:", error);
    await auditLogger.log({
      userId: "system",
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.RECRUITER_REQUEST,
      resourceId: context.params.requestId,
      details: `Failed to send recruiter request email: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      status: "failure",
    });
  }
};

const onRecruiterRequestApprovedHandler = async (
  change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
  context: functions.EventContext,
) => {
  try {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed to approved
    if (before.status !== "approved" && after.status === "approved") {
      const recruiterDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.fromRecruiter.recruiterId)
        .get();
      const recruiterEmail = recruiterDoc.data()?.email;

      if (!recruiterEmail) {
        throw new Error("Recruiter email not found");
      }

      const candidateDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.toUserId)
        .get();
      const candidateName = candidateDoc.data()?.firstName || "Candidate";

      const result = await emailService.sendEmail({
        to: recruiterEmail,
        template: "requestApproved" as any,
        data: {
          candidateName,
          profileUrl: `${process.env.WEBSITE_URL}/profile/${after.toUserId}`,
        },
      });

      if (result.success) {
        await auditLogger.logRecruiterRequest(
          context.params.requestId,
          after.fromRecruiter.recruiterId,
          after.toUserId,
          AuditAction.RECRUITER_REQUEST_APPROVED,
          true,
        );
      }
    }

    // Trigger if status changed to denied
    if (before.status !== "denied" && after.status === "denied") {
      const recruiterDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.fromRecruiter.recruiterId)
        .get();
      const recruiterEmail = recruiterDoc.data()?.email;

      if (!recruiterEmail) {
        throw new Error("Recruiter email not found");
      }

      const result = await emailService.sendEmail({
        to: recruiterEmail,
        template: "requestDenied" as any,
        data: {
          dashboardUrl: `${process.env.WEBSITE_URL}/recruiter/dashboard`,
        },
      });

      if (result.success) {
        await auditLogger.logRecruiterRequest(
          context.params.requestId,
          after.fromRecruiter.recruiterId,
          after.toUserId,
          AuditAction.RECRUITER_REQUEST_DENIED,
          false,
        );
      }
    }
  } catch (error) {
    console.error("Error sending request status email:", error);
    await auditLogger.log({
      userId: "system",
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.RECRUITER_REQUEST,
      resourceId: context.params.requestId,
      details: `Failed to send status update email: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      status: "failure",
    });
  }
};

const sendProfileViewDigestHandler = async (
  context: functions.EventContext,
) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const BATCH_SIZE = 100;
    let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
    let processedCount = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = admin
        .firestore()
        .collection("users")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const usersSnapshot = await query.get();

      if (usersSnapshot.empty) {
        break;
      }

      // Process batch in parallel with concurrency limit
      const promises = usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const userEmail = userDoc.data().email;

        if (!userEmail) return;

        // Get view count for the user's profiles
        const viewsSnapshot = await admin
          .firestore()
          .collectionGroup("views")
          .where("userId", "==", userId)
          .where("timestamp", ">=", oneWeekAgo)
          .count()
          .get();

        const viewCount = viewsSnapshot.data().count;

        if (viewCount > 0) {
          const result = await emailService.sendEmail({
            to: userEmail,
            template: "profileViewed" as any,
            data: {
              viewCount,
              dashboardUrl: `${process.env.WEBSITE_URL}/dashboard/analytics`,
            },
          });

          if (result.success) {
            await auditLogger.log({
              userId,
              userEmail,
              action: AuditAction.EMAIL_SENT,
              resourceType: ResourceType.EMAIL,
              resourceId: userId,
              details: "Weekly profile view digest sent",
              status: "success",
            });
          }
        }
      });

      await Promise.all(promises);

      processedCount += usersSnapshot.size;
      lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

      // Safety check for execution time (Cloud Functions timeout)
      // If we're running close to timeout (e.g. 60s default), we should probably stop or use Cloud Tasks
      // For now, we just log progress
      console.log(`Processed ${processedCount} users for digest`);
    }

    console.log("Weekly profile view digest sent");
  } catch (error) {
    console.error("Error sending profile view digest:", error);
    await auditLogger.log({
      userId: "system",
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.SYSTEM,
      resourceId: "digest",
      details: `Failed to send profile view digest: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      status: "failure",
    });
  }
};

const notifyAdminSuspiciousActivityHandler = async (
  data: any,
  context: functions.https.CallableContext,
) => {
  try {
    if (!context.auth) {
      throw new Error("Authentication required");
    }

    const { activityType, details, userId } = data;

    // Log suspicious activity
    await auditLogger.logSuspiciousActivity(
      userId || context.auth.uid,
      activityType,
      details,
    );

    // Get admin emails
    const adminsSnapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "admin")
      .get();

    const adminEmails = adminsSnapshot.docs
      .map((doc) => doc.data().email)
      .filter(Boolean);

    // Send emails to admins
    await emailService.sendBulkEmails(adminEmails, "adminNotification" as any, {
      alertType: activityType,
      details,
      timestamp: new Date().toISOString(),
      adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
    });

    return { success: true, message: "Admins notified" };
  } catch (error) {
    console.error("Error notifying admins:", error);
    throw new functions.https.HttpsError("internal", "Failed to notify admins");
  }
};

const cleanupAuditLogsHandler = async (context: functions.EventContext) => {
  try {
    const deletedCount = await auditLogger.cleanupOldLogs(90); // Keep 90 days
    console.log(`Cleaned up ${deletedCount} old audit logs`);
  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
  }
};

const resendVerificationEmailHandler = async (
  data: any,
  context: functions.https.CallableContext,
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const userId = context.auth.uid;
    const user = await admin.auth().getUser(userId);
    const email = user.email;

    if (!email) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User has no email address",
      );
    }

    if (user.emailVerified) {
      return { success: false, message: "Email already verified" };
    }

    // Get user data for personalization
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const userData = userDoc.data();

    // Generate verification link with multiple fallbacks
    let verificationLink = buildVerificationLink(); // Start with manual fallback
    try {
      // Try Firebase's link with redirect
      verificationLink = await admin
        .auth()
        .generateEmailVerificationLink(email, {
          url: `${process.env.WEBSITE_URL || "https://switchcv.com"}/dashboard`,
          handleCodeInApp: false,
        });
    } catch (e1) {
      console.warn(
        "Failed to generate link with redirect, trying simple link:",
        e1,
      );
      try {
        // Try Firebase's simple link (no redirect)
        verificationLink = await admin
          .auth()
          .generateEmailVerificationLink(email);
      } catch (e2) {
        // Both Firebase methods failed - use manual fallback
        // This handles rate limiting, domain issues, etc.
        console.warn(
          "Firebase link generation failed, using manual fallback:",
          e2,
        );

        try {
          verificationLink = await generateCustomVerificationToken(userId);
          console.log(
            "Generated custom verification token as fallback for resend",
          );
        } catch (e3) {
          console.error("Failed to generate custom token for resend:", e3);
        }
      }
    }

    const firstName = userData?.firstName || user.displayName || "User";
    const websiteUrl = process.env.WEBSITE_URL || "https://switchcv.com";

    // Use Firebase Trigger Email Extension (same as feedback emails)
    await admin
      .firestore()
      .collection("mail")
      .add({
        to: email,
        message: {
          subject: "SwitchCV - Verify Your Email",
          html: buildWelcomeEmailHtml(firstName, verificationLink, websiteUrl),
          text: buildWelcomeEmailText(firstName, verificationLink, websiteUrl),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await auditLogger.logEmailSent(userId, email, "verificationResend", true);
    return { success: true };
  } catch (error) {
    console.error("Error resending verification email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send verification email",
    );
  }
};

export {
  onUserCreatedHandler,
  onRecruiterRequestCreatedHandler,
  onRecruiterRequestApprovedHandler,
  sendProfileViewDigestHandler,
  notifyAdminSuspiciousActivityHandler,
  cleanupAuditLogsHandler,
  resendVerificationEmailHandler,
};

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send welcome email to new users
 */
export const onUserCreated = functions.auth
  .user()
  .onCreate(onUserCreatedHandler);

/**
 * Send email when recruiter request is created
 */
export const onRecruiterRequestCreated = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onCreate(onRecruiterRequestCreatedHandler);

/**
 * Send email when recruiter request is approved
 */
export const onRecruiterRequestApproved = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onUpdate(onRecruiterRequestApprovedHandler);

/**
 * Send profile view digest email (weekly)
 */
export const sendProfileViewDigest = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("America/New_York")
  .onRun(sendProfileViewDigestHandler);

/**
 * Send admin notification for suspicious activity
 */
export const notifyAdminSuspiciousActivity = functions.https.onCall(
  notifyAdminSuspiciousActivityHandler,
);

/**
 * Cleanup old audit logs (daily)
 */
export const cleanupAuditLogs = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("America/New_York")
  .onRun(cleanupAuditLogsHandler);
