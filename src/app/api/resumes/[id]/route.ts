import { logger } from "@/lib/logger";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  maybeGetAuthenticatedUserId,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { checkSequentialAccess } from "@/lib/security/accessMonitor";
import {
  getResume,
  updateResume,
  deleteResume,
  trackResumeView,
} from "@/lib/services/resumeService";
import { getUserTier } from "@/lib/services/userService";
import type { ResumeProfile } from "@/types";

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
    const rateLimitIdentifier = optionalUserId
      ? `user:${optionalUserId}`
      : `ip:${ip}`;

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
    const isSequentialSafe = await checkSequentialAccess(
      rateLimitIdentifier,
      id
    );
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

    // Use Service Layer
    const { resume: resumeData, access } = await getResume(
      id,
      optionalUserId || undefined
    );

    if (!resumeData || access === "none") {
      return handleApiError(
        new Error("Resume not found or access denied"),
        "Resume not found or access denied",
        404
      );
    }

    const isBeingEdited = resumeData?.isBeingEdited ?? false;

    // 1. Owner Access
    if (access === "owner") {
      logger.info(`[ResumeAPI] User is owner.`);
      return NextResponse.json(
        {
          ...resumeData,
          isBeingEdited,
          viewerAccess: {
            scope: "owner",
            isOwner: true,
          },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
          },
        }
      );
    }

    // 2. Admin Access
    if (access === "admin") {
      logger.info(`[ResumeAPI] User is admin.`);
      return NextResponse.json(
        {
          ...resumeData,
          isBeingEdited,
          viewerAccess: {
            scope: "admin-view",
            isOwner: false,
            isMasked: false,
          },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
          },
        }
      );
    }

    // 3. Explicit Grant (Recruiter)
    if (access === "granted") {
      logger.info(`[ResumeAPI] Access granted via explicit grant.`);
      // Track view could be moved to service ideally
      await trackResumeView(id);

      return NextResponse.json(
        {
          ...resumeData,
          isBeingEdited,
          viewerAccess: {
            scope: "full",
            isOwner: false,
            isMasked: false,
          },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
          },
        }
      );
    }

    // 4. Public Snapshot
    if (access === "public_snapshot") {
      logger.info(`[ResumeAPI] Returning public snapshot.`);
      // Track view
      await trackResumeView(id);

      return NextResponse.json(
        { ...resumeData, isBeingEdited },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    // Default Deny
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

    const { userId, error } = await getAuthenticatedUserId(request);
    if (error || !userId) return error;

    if (typeof isPublic !== "boolean") {
      return handleApiError(
        new Error("Invalid visibility state"),
        "Invalid visibility state",
        400
      );
    }

    // Check ownership via service
    const { access } = await getResume(id, userId);
    if (access !== "owner") {
      return handleApiError(new Error("Unauthorized"), "Unauthorized", 403);
    }

    // Update Visibility using service (we reuse updateResume or need a specific one?
    // updateResume takes 'any' data so it should work if we pass partial)
    // Actually updateResume in service does a set with merge: true.
    // These are runtime metadata fields, not part of ResumeProfile type
    await updateResume(id, userId, {
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      published: isPublic,
    } as Partial<ResumeProfile>);

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

    const { userId, error } = await getAuthenticatedUserId(request);
    if (error || !userId) return error;

    // Check Ownership
    const { access, resume } = await getResume(id, userId);
    if (access !== "owner") {
      return handleApiError(new Error("Unauthorized"), "Unauthorized", 403);
    }

    // Check Editing Permissions (Only Premium/Enterprise/etc can edit)
    const tier = await getUserTier(userId);
    const isBasicTier = tier === "basic";

    if (isBasicTier) {
      return handleApiError(
        new Error("Editing restricted"),
        "Editing is not allowed on the Basic tier. Please upgrade to Premium to edit your resume.",
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

    // Use Service
    await updateResume(id, userId, resumePayload);

    // Return the updated data (simplification: merge payload with existing for response)
    return NextResponse.json({
      success: true,
      resume: {
        ...resume, // old data
        ...resumePayload, // new data
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

    const { userId, error } = await getAuthenticatedUserId(request);
    if (error || !userId) return error;

    // Service handles ownership check inside deleteResume too, but we can double check or rely on service.
    // The service implementation I wrote checks: if (doc.data()?.userId !== userId) throw new Error("Unauthorized");

    await deleteResume(id, userId);

    logger.info(`[ResumeAPI] Deleted resume ${id}.`);

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    // Check if it's our service error
    if (error instanceof Error && error.message === "Unauthorized") {
      return handleApiError(error, "Unauthorized", 403);
    }
    return handleApiError(error, "Error deleting resume");
  }
}
