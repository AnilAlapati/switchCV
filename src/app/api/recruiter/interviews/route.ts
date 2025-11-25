/**
 * Recruiter Interviews API Route
 * POST /api/recruiter/interviews
 * Handles interview scheduling, status updates, and feedback
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Interview,
  InterviewType,
  InterviewStatus,
  InterviewFeedback,
} from "@/lib/recruiterDashboard.types";
import {
  scheduleInterview,
  getUpcomingInterviews,
} from "@/lib/recruiterPipeline";
import { handleApiError } from "@/lib/utils/api-helpers";

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

// In-memory interview storage (replace with database in production)
export const interviews = new Map<string, Interview>();

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

        interviews.set(interview.id, interview);

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
        const interview = interviews.get(interviewId);

        if (!interview) {
          return handleApiError(null, "Interview not found", 404);
        }

        const updated: Interview = {
          ...interview,
          status,
          updatedAt: new Date(),
        };
        interviews.set(interviewId, updated);

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
        const interview = interviews.get(interviewId);

        if (!interview) {
          return handleApiError(null, "Interview not found", 404);
        }

        const updated: Interview = {
          ...interview,
          feedback,
          status: InterviewStatus.COMPLETED,
          updatedAt: new Date(),
        };
        interviews.set(interviewId, updated);

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
        const allInterviews = Array.from(interviews.values());
        const upcoming = getUpcomingInterviews(allInterviews, days || 7);

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
    return handleApiError(error, "Internal server error");
  }
}

export async function GET(request: NextRequest) {
  try {
    const interviewId = request.nextUrl.searchParams.get("id");
    const candidateId = request.nextUrl.searchParams.get("candidateId");

    if (interviewId) {
      const interview = interviews.get(interviewId);
      if (!interview) {
        return handleApiError(null, "Interview not found", 404);
      }

      return NextResponse.json(
        {
          success: true,
          interview,
        },
        { status: 200 }
      );
    }

    if (candidateId) {
      const candidateInterviews = Array.from(interviews.values()).filter(
        (i) => i.candidateId === candidateId
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

    // Return all interviews
    const allInterviews = Array.from(interviews.values());
    return NextResponse.json(
      {
        success: true,
        interviews: allInterviews,
        count: allInterviews.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, "Internal server error");
  }
}
