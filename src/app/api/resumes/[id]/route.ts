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

    const ownerId = resumeData?.userId ?? null;
    const optionalUserId = await maybeGetAuthenticatedUserId(request);
    console.log(
      `[ResumeAPI] Fetching resume ${id}. AuthUser: ${optionalUserId}`
    );

    const isOwner = Boolean(
      optionalUserId && ownerId && optionalUserId === ownerId
    );

    // 1. Owner Access
    if (isOwner) {
      console.log(`[ResumeAPI] User is owner.`);
      return NextResponse.json({
        ...resumeData,
        viewerAccess: {
          scope: "owner",
          isOwner: true,
        },
      });
    }

    // 2. Authenticated User Checks (Admin or Approved Recruiter)
    if (optionalUserId) {
      try {
        // Check Admin
        const userDoc = await adminDb
          .collection("users")
          .doc(optionalUserId)
          .get();
        const userData = userDoc.data();

        if (userData?.role === "admin") {
          console.log(`[ResumeAPI] User is admin.`);
          return NextResponse.json({
            ...resumeData,
            viewerAccess: {
              scope: "admin-view",
              isOwner: false,
              isMasked: false,
            },
          });
        }

        // Check Approved Access Request OR Active Grant
        console.log(
          `[ResumeAPI] Checking access for user ${optionalUserId} on resume ${id}`
        );

        // Fetch all requests and grants for this resume to avoid index issues
        // We filter in-memory to prevent FAILED_PRECONDITION errors from missing indexes
        const [requestsSnap, grantsSnap] = await Promise.all([
          adminDb
            .collection("resumes")
            .doc(id)
            .collection("accessRequests")
            .get(),
          adminDb
            .collection("resumes")
            .doc(id)
            .collection("accessGrants")
            .get(),
        ]);

        console.log(
          `[ResumeAPI] Found ${requestsSnap.size} total requests and ${grantsSnap.size} total grants.`
        );

        const now = new Date();

        const hasApprovedRequest = requestsSnap.docs.some((doc) => {
          const data = doc.data();
          if (
            data.fromUserId !== optionalUserId ||
            data.status !== "approved"
          ) {
            return false;
          }

          const expiresAt = data.expiresAt?.toDate?.()
            ? data.expiresAt.toDate()
            : data.expiresAt
            ? new Date(data.expiresAt)
            : null;

          return !expiresAt || expiresAt > now;
        });

        const hasValidGrant = grantsSnap.docs.some((doc) => {
          const data = doc.data();
          if (data.toUserId !== optionalUserId) {
            return false;
          }

          const expiresAt = data.expiresAt?.toDate?.()
            ? data.expiresAt.toDate()
            : data.expiresAt
            ? new Date(data.expiresAt)
            : null;

          return !expiresAt || expiresAt > now;
        });

        if (hasApprovedRequest || hasValidGrant) {
          console.log(
            `[ResumeAPI] Access granted via ${
              hasApprovedRequest ? "request" : "grant"
            }.`
          );

          // Track view for recruiter metrics
          adminDb
            .collection("recruiterMetrics")
            .doc(optionalUserId)
            .set(
              {
                totalProfileViews: FieldValue.increment(1),
                lastActivityAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            )
            .catch((err) =>
              console.error("Failed to track profile view:", err)
            );

          return NextResponse.json({
            ...resumeData,
            viewerAccess: {
              scope: "full",
              isOwner: false,
              isMasked: false,
            },
          });
        }
      } catch (accessCheckError) {
        console.error(
          "Error checking authenticated user access:",
          accessCheckError
        );
        // Fall through to public check or denial
      }
    }

    // 3. Public Access
    if (isPublic) {
      console.log(`[ResumeAPI] Returning public snapshot.`);
      const sanitized = sanitizeResumeForPublicView(resumeData);
      return NextResponse.json(sanitized);
    }

    // 4. Unauthorized / Forbidden
    if (!optionalUserId) {
      return handleApiError(new Error("Unauthorized"), "Unauthorized", 401);
    }

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

    await docRef.set(
      {
        ...sanitizedResume,
        updatedAt: timestamp,
        lastUpdatedAt: timestamp,
      },
      { merge: true }
    );

    try {
      await adminDb
        .collection("users")
        .doc(requestUserId)
        .collection("resumes")
        .doc(id)
        .set(
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
    } catch (subcollectionError) {
      console.error(
        "Error updating user resume subcollection:",
        subcollectionError
      );
    }

    try {
      await adminDb
        .collection("allResumes")
        .doc(id)
        .set(
          {
            title: sanitizedResume.title ?? existingData?.title,
            updatedAt: timestamp,
            userId: requestUserId,
            numericId: existingData?.numericId,
            isPublic: existingData?.isPublic,
          },
          { merge: true }
        );
    } catch (globalError) {
      console.error("Error updating allResumes collection:", globalError);
    }

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
