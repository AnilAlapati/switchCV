/**
 * Recruiter Interviews API Route
 * POST /api/recruiter/interviews
 * Handles interview scheduling, status updates, and feedback
 *
 * FIXED: Now persists to Firestore instead of in-memory Map
 */

import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, serverTimestamp } from "@/lib/dal";
import type { DocumentSnapshot } from "@/lib/dal";
import {
  Interview,
  InterviewType,
  InterviewStatus,
  InterviewFeedback,
} from "@/lib/recruiterDashboard.types";
import { scheduleInterview } from "@/lib/recruiterPipeline";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { RecruiterInterviewsActionSchema } from "@/lib/schemas/api";
import { logger } from "@/lib/logger";

interface ScheduleRequest {
  action: "schedule";
  candidateId: string;
  jobId: string;
  type: InterviewType;
  scheduledTime: string;
  duration: number;
  interviewers: string[];
  location?: string;
  notes?: string;
}

interface UpdateStatusRequest {
  action: "update-status";
  interviewId: string;
  status: InterviewStatus;
}

interface AddFeedbackRequest {
  action: "add-feedback";
  interviewId: string;
  feedback: InterviewFeedback;
}

interface GetUpcomingRequest {
  action: "get-upcoming";
  days?: number;
}

type InterviewRequest =
  | ScheduleRequest
  | UpdateStatusRequest
  | AddFeedbackRequest
  | GetUpcomingRequest;

/**
 * Helper to verify recruiter role
 */
async function verifyRecruiterRole(userId: string): Promise<boolean> {
  const userSnap = await collectionRef(COLLECTIONS.USERS).doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "recruiter" || userData?.role === "admin";
}

/**
 * Helper to convert Firestore doc to Interview object
 */
function docToInterview(doc: DocumentSnapshot): Interview | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    scheduledTime: data.scheduledTime?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Interview;
}

export async function POST(request: NextRequest) {
  const { userId: authUserId, error: authError } =
    await getAuthenticatedUserId(request);
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const payload = await request.json();
    const action = (payload as { action?: unknown })?.action;

    if (
      action !== "schedule" &&
      action !== "update-status" &&
      action !== "add-feedback" &&
      action !== "get-upcoming"
    ) {
      return handleApiError(null, "Invalid action", 400);
    }

    const parseResult = RecruiterInterviewsActionSchema.safeParse(payload);
    if (!parseResult.success) {
      if (action === "schedule") {
        return handleApiError(
          null,
          "Missing required fields: candidateId, jobId, type, scheduledTime, interviewers",
          400,
        );
      }
      return handleApiError(null, "Invalid request payload", 400);
    }
    const body = parseResult.data as unknown as InterviewRequest;

    switch (body.action) {
      case "schedule": {
        const {
          candidateId,
          jobId,
          type,
          scheduledTime,
          duration,
          interviewers,
          location,
          notes,
        } = body as ScheduleRequest;

        const interview = scheduleInterview(
          candidateId,
          jobId,
          type,
          new Date(scheduledTime),
          duration,
          interviewers,
        );

        // Save to Firestore
        await collectionRef(COLLECTIONS.RECRUITER_INTERVIEWS)
          .doc(interview.id)
          .set({
            ...interview,
            scheduledTime: new Date(scheduledTime),
            location: location || null,
            notes: notes || null,
            createdBy: authUserId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

        logger.info(
          { interviewId: interview.id, candidateId },
          "Interview scheduled",
        );

        return NextResponse.json(
          {
            success: true,
            interview,
            message: "Interview scheduled successfully",
          },
          { status: 201 },
        );
      }

      case "update-status": {
        const { interviewId, status } = body as UpdateStatusRequest;

        const interviewRef = collectionRef(
          COLLECTIONS.RECRUITER_INTERVIEWS,
        ).doc(interviewId);
        const interviewDoc = await interviewRef.get();

        if (!interviewDoc.exists) {
          return handleApiError(null, "Interview not found", 404);
        }

        // SECURITY: Verify ownership — recruiters can only update their own interviews
        if (interviewDoc.data()?.createdBy !== authUserId) {
          return handleApiError(null, "Forbidden: Not your interview", 403);
        }

        // Update in Firestore
        await interviewRef.update({
          status,
          updatedAt: serverTimestamp(),
        });

        const updated = {
          ...interviewDoc.data(),
          id: interviewId,
          status,
          updatedAt: new Date(),
        };

        logger.info({ interviewId, status }, "Interview status updated");

        return NextResponse.json(
          {
            success: true,
            interview: updated,
            message: "Interview status updated",
          },
          { status: 200 },
        );
      }

      case "add-feedback": {
        const { interviewId, feedback } = body as AddFeedbackRequest;

        const interviewRef = collectionRef(
          COLLECTIONS.RECRUITER_INTERVIEWS,
        ).doc(interviewId);
        const interviewDoc = await interviewRef.get();

        if (!interviewDoc.exists) {
          return handleApiError(null, "Interview not found", 404);
        }

        // SECURITY: Verify ownership — recruiters can only add feedback to their own interviews
        if (interviewDoc.data()?.createdBy !== authUserId) {
          return handleApiError(null, "Forbidden: Not your interview", 403);
        }

        // Update in Firestore
        await interviewRef.update({
          feedback,
          status: InterviewStatus.COMPLETED,
          updatedAt: serverTimestamp(),
        });

        const updated = {
          ...interviewDoc.data(),
          id: interviewId,
          feedback,
          status: InterviewStatus.COMPLETED,
          updatedAt: new Date(),
        };

        logger.info({ interviewId }, "Interview feedback added");

        return NextResponse.json(
          {
            success: true,
            interview: updated,
            message: "Feedback added successfully",
          },
          { status: 201 },
        );
      }

      case "get-upcoming": {
        const { days } = body as GetUpcomingRequest;
        const daysToQuery = days || 7;

        // Query upcoming interviews
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysToQuery);

        const snapshot = await collectionRef(COLLECTIONS.RECRUITER_INTERVIEWS)
          .where("createdBy", "==", authUserId)
          .where("scheduledTime", ">=", now)
          .where("scheduledTime", "<=", futureDate)
          .where("status", "==", InterviewStatus.SCHEDULED)
          .orderBy("scheduledTime", "asc")
          .get();

        const upcoming: Interview[] = snapshot.docs.map(
          (doc) => docToInterview(doc)!,
        );

        return NextResponse.json(
          {
            success: true,
            interviews: upcoming,
            count: upcoming.length,
          },
          { status: 200 },
        );
      }

      default:
        return handleApiError(null, "Invalid action", 400);
    }
  } catch (error) {
    logger.error({ err: error }, "Interviews API error");
    return handleApiError(error, "Internal server error");
  }
}

export async function GET(request: NextRequest) {
  const { userId: authUserId, error: authError } =
    await getAuthenticatedUserId(request);
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const interviewId = request.nextUrl.searchParams.get("id");
    const candidateId = request.nextUrl.searchParams.get("candidateId");

    if (interviewId) {
      const interviewDoc = await collectionRef(COLLECTIONS.RECRUITER_INTERVIEWS)
        .doc(interviewId)
        .get();

      if (!interviewDoc.exists) {
        return handleApiError(null, "Interview not found", 404);
      }

      // SECURITY: Verify ownership — recruiters can only view their own interviews
      if (interviewDoc.data()?.createdBy !== authUserId) {
        return handleApiError(null, "Forbidden: Not your interview", 403);
      }

      return NextResponse.json(
        {
          success: true,
          interview: docToInterview(interviewDoc),
        },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (candidateId) {
      // SECURITY: Filter by ownership
      const snapshot = await collectionRef(COLLECTIONS.RECRUITER_INTERVIEWS)
        .where("createdBy", "==", authUserId)
        .where("candidateId", "==", candidateId)
        .orderBy("scheduledTime", "desc")
        .get();

      const candidateInterviews: Interview[] = snapshot.docs.map(
        (doc) => docToInterview(doc)!,
      );

      return NextResponse.json(
        {
          success: true,
          interviews: candidateInterviews,
          count: candidateInterviews.length,
        },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // Return all interviews (with pagination limit) — SECURITY: Filter by ownership
    const snapshot = await collectionRef(COLLECTIONS.RECRUITER_INTERVIEWS)
      .where("createdBy", "==", authUserId)
      .orderBy("scheduledTime", "desc")
      .limit(100)
      .get();

    const allInterviews: Interview[] = snapshot.docs.map(
      (doc) => docToInterview(doc)!,
    );

    return NextResponse.json(
      {
        success: true,
        interviews: allInterviews,
        count: allInterviews.length,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error({ err: error }, "Interviews GET error");
    return handleApiError(error, "Internal server error");
  }
}
