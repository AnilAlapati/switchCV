import { logger } from "@/lib/logger";
import { z } from "zod";
/* eslint-disable max-lines */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sanitizeResumePayload } from "@/lib/utils/resumeEditor";
import { FieldValue } from "firebase-admin/firestore";
import {
  fetchResumeDocument,
  handleApiError,
  maybeGetAuthenticatedUserId,
  verifyResumeOwnership,
} from "@/lib/utils/api-helpers";
import { sanitizeResumeForPublicView } from "@/lib/utils/resumeVisibility";
import { getUserTier } from "@/lib/services/userService";
import { getResumeEditingAllowed } from "@/lib/config.server";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { checkSequentialAccess } from "@/lib/security/accessMonitor";
import { addDeletedIdToPool } from "@/lib/resumeIdRecycler";

type AccessGrantType = "request" | "grant";

function resolveExpiryTimestamp(value: any): Date | null {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function checkPrivateResumeAccess(
  resumeId: string,
  viewerId: string
): Promise<AccessGrantType | null> {
  try {
    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    // Only check grants for valid access. Requests are for history/status tracking.
    const grantsSnap = await resumeRef
      .collection("accessGrants")
      .where("toUserId", "==", viewerId)
      .get();

    logger.info(
      `[ResumeAPI] Found ${grantsSnap.size} grants for user ${viewerId}.`
    );

    const now = new Date();

    const hasValidGrant = grantsSnap.docs.some((doc) => {
      const data = doc.data();
      // Double check toUserId just in case, though query handles it
      if (data.toUserId !== viewerId) {
        return false;
      }

      const expiresAt = resolveExpiryTimestamp(data.expiresAt);
      return !expiresAt || expiresAt > now;
    });

    if (hasValidGrant) {
      return "grant";
    }
  } catch (error) {
    logger.error({ err: error }, "Error checking authenticated user access:");
  }

  return null;
}

async function trackRecruiterProfileView(userId: string) {
  return adminDb
    .collection("recruiterMetrics")
    .doc(userId)
    .set(
      {
        totalProfileViews: FieldValue.increment(1),
        lastActivityAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    .catch((err) =>
      logger.error({ err: err }, "Failed to track profile view:")
    );
}

async function trackJobSeekerProfileView(userId: string) {
  return adminDb
    .collection("jobSeekerMetrics")
    .doc(userId)
    .set(
      {
        profileViews: FieldValue.increment(1),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    .catch((err) =>
      logger.error({ err: err }, "Failed to track job seeker profile view:")
    );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    // Rate Limiting
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const optionalUserId = await maybeGetAuthenticatedUserId(request);
    const rateLimitIdentifier = optionalUserId ? `user:${optionalUserId}` : `ip:${ip}`;

    // Stricter limit for unauthenticated (public) access to prevent scraping
    const limit = optionalUserId ? 30 : 10;
    const rateLimitResult = await checkRateLimit(rateLimitIdentifier, {
      limit,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      logger.warn(
        { identifier: rateLimitIdentifier, path: `/api/resumes/${id}` },
        "[ResumeAPI] Rate limit exceeded"
      );
      return handleApiError(
        null,
        "Too many requests. Please try again later.",
        429
      );
    }

    // Scraping Protection (Sequential Access)
    const isSequentialSafe = await checkSequentialAccess(rateLimitIdentifier, id);
    if (!isSequentialSafe) {
      return handleApiError(
        null,
        "Access denied due to suspicious activity.",
        403
      );
    }

    // Block access to ID 1 (Reserved)
    if (id === "1") {
      return handleApiError(
        new Error("Reserved System ID"),
        "This ID is reserved for system demonstration purposes and is not publicly accessible.",
        403
      );
    }

    const resumeDoc = await fetchResumeDocument(id);

    if (!resumeDoc) {
      return handleApiError(
        new Error("Resume not found"),
        "Resume not found",
        404
      );
    }

    const { data: resumeData } = resumeDoc;
    const isPublic =
      resumeData?.isPublic ||
      resumeData?.visibility === "public" ||
      resumeData?.published === true;
    const isBeingEdited = resumeData?.isBeingEdited ?? false;

    const ownerId = resumeData?.userId ?? null;
    // optionalUserId is already defined above for rate limiting
    logger.info(
      `[ResumeAPI] Fetching resume ${id}. AuthUser: ${optionalUserId}`
    );

    const isOwner = Boolean(
      optionalUserId && ownerId && optionalUserId === ownerId
    );

    // 1. Owner Access
    if (isOwner) {
      logger.info(`[ResumeAPI] User is owner.`);
      return NextResponse.json({
        ...resumeData,
        isBeingEdited,
        viewerAccess: {
          scope: "owner",
          isOwner: true,
        },
      });
    }

    const viewMode = request.nextUrl.searchParams.get("view");
    const forceFullAccessCheck = viewMode === "full";

    let viewerData: Record<string, any> | null = null;
    if (optionalUserId) {
      const userDoc = await adminDb
        .collection("users")
        .doc(optionalUserId)
        .get();
      viewerData = userDoc.data() || null;
    }

    if (viewerData?.role === "admin") {
      logger.info(`[ResumeAPI] User is admin.`);
      return NextResponse.json({
        ...resumeData,
        isBeingEdited,
        viewerAccess: {
          scope: "admin-view",
          isOwner: false,
          isMasked: false,
        },
      });
    }

    // 2. Check for explicit access grant (Recruiter)
    let hasGrantedAccess = false;
    if (optionalUserId) {
      logger.info(
        `[ResumeAPI] Checking private access for user ${optionalUserId} on resume ${id}`
      );
      const accessGrantType = await checkPrivateResumeAccess(
        id,
        optionalUserId
      );

      if (accessGrantType) {
        hasGrantedAccess = true;
        logger.info(`[ResumeAPI] Access granted via ${accessGrantType}.`);
        await trackRecruiterProfileView(optionalUserId);
      }
    }

    // 3. Return Full Access if granted
    if (hasGrantedAccess) {
      if (ownerId) {
        trackJobSeekerProfileView(ownerId);
      }
      return NextResponse.json({
        ...resumeData,
        isBeingEdited,
        viewerAccess: {
          scope: "full",
          isOwner: false,
          isMasked: false,
        },
      });
    }

    // 4. Public Snapshot Fallback
    // If public and NO grant, return snapshot
    if (isPublic && !forceFullAccessCheck) {
      logger.info(`[ResumeAPI] Returning public snapshot.`);
      if (ownerId) {
        trackJobSeekerProfileView(ownerId);
      }
      const sanitized = sanitizeResumeForPublicView(resumeData);
      return NextResponse.json(
        { ...sanitized, isBeingEdited },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    if (!optionalUserId) {
      return handleApiError(new Error("Unauthorized"), "Unauthorized", 401);
    }

    // If we got here: Not Owner, Not Admin, Not Granted, Not Public (or forced full check failed)
    return handleApiError(
      new Error("Permission denied"),
      "Permission denied",
      403
    );
  } catch (error) {
    return handleApiError(error, "Error fetching resume");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;

    if (typeof isPublic !== "boolean") {
      return handleApiError(
        new Error("Invalid visibility state"),
        "Invalid visibility state",
        400
      );
    }

    const verification = await verifyResumeOwnership(request, id);
    if (!verification.success) {
      return verification.error;
    }

    const { docRef } = verification;

    // Update Visibility
    await docRef.update({
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      published: isPublic,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, isPublic });
  } catch (error) {
    return handleApiError(error, "Error updating resume visibility");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    const verification = await verifyResumeOwnership(request, id);
    if (!verification.success) {
      return verification.error;
    }

    const { userId: requestUserId, docRef } = verification;

    // Check Editing Permissions
    const tier = await getUserTier(requestUserId!);
    const editingAllowed = await getResumeEditingAllowed();
    const canEdit = editingAllowed[tier];

    if (!canEdit) {
      return handleApiError(
        new Error("Editing restricted"),
        `Editing is not allowed on the ${tier} plan. Please upgrade to edit your resume.`,
        403
      );
    }

    const body = await request.json();

    // Validate input using Zod
    const updateSchema = z.object({
      resume: z.object({
        title: z.string().min(1, "Title is required"),
        summary: z.string().optional(),
        experience: z.array(z.any()).optional(),
        education: z.array(z.any()).optional(),
        skills: z.array(z.any()).optional(),
        projects: z.array(z.any()).optional(),
        certifications: z.array(z.any()).optional(),
        languages: z.array(z.any()).optional(),
        interests: z.array(z.any()).optional(),
      }),
    });

    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return handleApiError(
        new Error("Invalid input"),
        result.error.issues.map((e: z.ZodIssue) => e.message).join(", "),
        400
      );
    }

    const resumePayload = result.data.resume;

    const sanitizedResume = sanitizeResumePayload(resumePayload);
    const timestamp = new Date().toISOString();

    await docRef.set(
      {
        ...sanitizedResume,
        updatedAt: timestamp,
        lastUpdatedAt: timestamp,
      },
      { merge: true }
    );

    const refreshedSnap = await docRef.get();
    const refreshedData = refreshedSnap.data() ?? {};

    return NextResponse.json({
      success: true,
      resume: {
        ...refreshedData,
        id,
      },
    });
  } catch (error) {
    return handleApiError(error, "Error updating resume");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return handleApiError(
        new Error("Resume ID is required"),
        "Resume ID is required",
        400
      );
    }

    // Verify ownership
    const verification = await verifyResumeOwnership(request, id);
    if (!verification.success) {
      return verification.error;
    }

    const { docRef } = verification;

    // Delete the document
    await docRef.delete();

    // Recycle the numeric ID
    // We assume 'id' here is numeric based on previous logic, but check to be safe
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      // Async (fire & forget) to not block response
      addDeletedIdToPool(numericId).catch((err) =>
        logger.error({ err, numericId }, "Failed to recycle resume ID")
      );
    }

    logger.info(`[ResumeAPI] Deleted resume ${id}.`);

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    return handleApiError(error, "Error deleting resume");
  }
}
