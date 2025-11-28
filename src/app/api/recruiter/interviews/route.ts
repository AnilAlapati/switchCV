/**
 * Recruiter Interviews API Route
 * POST /api/recruiter/interviews
 * Handles interview scheduling, status updates, and feedback
 *
 * FIXED: Now persists to Firestore instead of in-memory Map
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  Interview,
  InterviewType,
  InterviewStatus,
  InterviewFeedback,
} from "@/lib/recruiterDashboard.types";
import { scheduleInterview } from "@/lib/recruiterPipeline";
import { handleApiError } from "@/lib/utils/api-helpers";
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

const INTERVIEWS_COLLECTION = "recruiterInterviews";

/**
 * Helper to convert Firestore doc to Interview object
 */
function docToInterview(
  doc: FirebaseFirestore.DocumentSnapshot
): Interview | null {
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
  try {
    const body: InterviewRequest = await request.json();

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

        if (
          !candidateId ||
          !jobId ||
          !type ||
          !scheduledTime ||
          !interviewers
        ) {
          return handleApiError(
            null,
            "Missing required fields: candidateId, jobId, type, scheduledTime, interviewers",
            400
          );
        }

        const interview = scheduleInterview(
          candidateId,
          jobId,
          type,
          new Date(scheduledTime),
          duration,
          interviewers
        );

        // Save to Firestore
        await adminDb
          .collection(INTERVIEWS_COLLECTION)
          .doc(interview.id)
          .set({
            ...interview,
            scheduledTime: new Date(scheduledTime),
            location: location || null,
            notes: notes || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

        logger.info(
          { interviewId: interview.id, candidateId },
          "Interview scheduled"
        );

        return NextResponse.json(
          {
            success: true,
            interview,
            message: "Interview scheduled successfully",
          },
          { status: 201 }
        );
      }

      case "update-status": {
        const { interviewId, status } = body as UpdateStatusRequest;

        const interviewRef = adminDb
          .collection(INTERVIEWS_COLLECTION)
          .doc(interviewId);
        const interviewDoc = await interviewRef.get();

        if (!interviewDoc.exists) {
          return handleApiError(null, "Interview not found", 404);
        }

        // Update in Firestore
        await interviewRef.update({
          status,
          updatedAt: FieldValue.serverTimestamp(),
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
          { status: 200 }
        );
      }

      case "add-feedback": {
        const { interviewId, feedback } = body as AddFeedbackRequest;

        const interviewRef = adminDb
          .collection(INTERVIEWS_COLLECTION)
          .doc(interviewId);
        const interviewDoc = await interviewRef.get();

        if (!interviewDoc.exists) {
          return handleApiError(null, "Interview not found", 404);
        }

        // Update in Firestore
        await interviewRef.update({
          feedback,
          status: InterviewStatus.COMPLETED,
          updatedAt: FieldValue.serverTimestamp(),
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
          { status: 201 }
        );
      }

      case "get-upcoming": {
        const { days } = body as GetUpcomingRequest;
        const daysToQuery = days || 7;

        // Query upcoming interviews
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysToQuery);

        const snapshot = await adminDb
          .collection(INTERVIEWS_COLLECTION)
          .where("scheduledTime", ">=", now)
          .where("scheduledTime", "<=", futureDate)
          .where("status", "==", InterviewStatus.SCHEDULED)
          .orderBy("scheduledTime", "asc")
          .get();

        const upcoming: Interview[] = snapshot.docs.map(
          (doc) => docToInterview(doc)!
        );

        return NextResponse.json(
          {
            success: true,
            interviews: upcoming,
            count: upcoming.length,
          },
          { status: 200 }
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
  try {
    const interviewId = request.nextUrl.searchParams.get("id");
    const candidateId = request.nextUrl.searchParams.get("candidateId");

    if (interviewId) {
      const interviewDoc = await adminDb
        .collection(INTERVIEWS_COLLECTION)
        .doc(interviewId)
        .get();

      if (!interviewDoc.exists) {
        return handleApiError(null, "Interview not found", 404);
      }

      return NextResponse.json(
        {
          success: true,
          interview: docToInterview(interviewDoc),
        },
        { status: 200 }
      );
    }

    if (candidateId) {
      const snapshot = await adminDb
        .collection(INTERVIEWS_COLLECTION)
        .where("candidateId", "==", candidateId)
        .orderBy("scheduledTime", "desc")
        .get();

      const candidateInterviews: Interview[] = snapshot.docs.map(
        (doc) => docToInterview(doc)!
      );

      return NextResponse.json(
        {
          success: true,
          interviews: candidateInterviews,
          count: candidateInterviews.length,
        },
        { status: 200 }
      );
    }

    // Return all interviews (with pagination limit)
    const snapshot = await adminDb
      .collection(INTERVIEWS_COLLECTION)
      .orderBy("scheduledTime", "desc")
      .limit(100)
      .get();

    const allInterviews: Interview[] = snapshot.docs.map(
      (doc) => docToInterview(doc)!
    );

    return NextResponse.json(
      {
        success: true,
        interviews: allInterviews,
        count: allInterviews.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ err: error }, "Interviews GET error");
    return handleApiError(error, "Internal server error");
  }
}
