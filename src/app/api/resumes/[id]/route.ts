import { logger } from "@/lib/logger";
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
import { RESUME_EDITING_ALLOWED } from "@/lib/config";

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
    .catch((err) => logger.error({ err: err }, "Failed to track profile view:"));
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
    const optionalUserId = await maybeGetAuthenticatedUserId(request);
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

    const {
      userId: requestUserId,
      docRef,
      resumeData: existingData,
    } = verification;

    // Check Editing Permissions
    const tier = await getUserTier(requestUserId!);
    const canEdit = RESUME_EDITING_ALLOWED[tier];

    if (!canEdit) {
      return handleApiError(
        new Error("Editing restricted"),
        `Editing is not allowed on the ${tier} plan. Please upgrade to edit your resume.`,
        403
      );
    }

    const body = await request.json();
    const resumePayload = body?.resume;

    if (!resumePayload || typeof resumePayload !== "object") {
      return handleApiError(
        new Error("Invalid resume payload"),
        "Invalid resume payload",
        400
      );
    }

    const sanitizedResume = sanitizeResumePayload(resumePayload);
    const timestamp = new Date().toISOString();

    // Use a batch write for atomicity and performance
    const batch = adminDb.batch();

    // 1. Update main resume document
    batch.set(
      docRef,
      {
        ...sanitizedResume,
        updatedAt: timestamp,
        lastUpdatedAt: timestamp,
      },
      { merge: true }
    );

    // 2. Update user's subcollection
    const userResumeRef = adminDb
      .collection("users")
      .doc(requestUserId)
      .collection("resumes")
      .doc(id);

    batch.set(
      userResumeRef,
      {
        ...sanitizedResume,
        updatedAt: timestamp,
        lastUpdatedAt: timestamp,
        userId: requestUserId,
        numericId: existingData?.numericId,
        isPublic: existingData?.isPublic,
        visibility: existingData?.visibility,
      },
      { merge: true }
    );

    // 3. Update global search index
    const globalResumeRef = adminDb.collection("allResumes").doc(id);
    batch.set(
      globalResumeRef,
      {
        title: sanitizedResume.title ?? existingData?.title,
        updatedAt: timestamp,
        userId: requestUserId,
        numericId: existingData?.numericId,
        isPublic: existingData?.isPublic,
      },
      { merge: true }
    );

    // Commit all changes atomically
    await batch.commit();

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
