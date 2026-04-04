/**
 * Recruiter Candidates API Route
 * POST /api/recruiter/candidates
 * Handles candidate CRUD operations and queries
 *
 * FIXED: Now persists to Firestore instead of in-memory Map
 */

import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, serverTimestamp } from "@/lib/dal";
import {
  Candidate,
  CandidatePriority,
  CandidateNote,
} from "@/lib/recruiterDashboard.types";
import {
  createCandidate,
  updateCandidatePriority,
  addCandidateNote,
} from "@/lib/recruiterPipeline";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { RecruiterCandidatesActionSchema } from "@/lib/schemas/api";
import { logger } from "@/lib/logger";

interface CreateRequest {
  action: "create";
  name: string;
  email: string;
  position: string;
  phone?: string;
  resumeUrl?: string;
  source?: string;
}

interface UpdatePriorityRequest {
  action: "update-priority";
  candidateId: string;
  priority: CandidatePriority;
}

interface AddNoteRequest {
  action: "add-note";
  candidateId: string;
  userId?: string;
  content: string;
  category?: string;
  isPrivate?: boolean;
}

type CandidateRequest = CreateRequest | UpdatePriorityRequest | AddNoteRequest;

const NOTES_SUBCOLLECTION = "notes";

/**
 * Helper to verify recruiter role
 */
async function verifyRecruiterRole(userId: string): Promise<boolean> {
  const userSnap = await collectionRef(COLLECTIONS.USERS).doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "recruiter" || userData?.role === "admin";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
      action !== "create" &&
      action !== "update-priority" &&
      action !== "add-note"
    ) {
      return handleApiError(null, "Invalid action", 400);
    }

    const parseResult = RecruiterCandidatesActionSchema.safeParse(payload);
    if (!parseResult.success) {
      if (action === "create") {
        return handleApiError(
          null,
          "Missing required fields: name, email, position",
          400,
        );
      }
      if (action === "add-note") {
        return handleApiError(
          null,
          "Missing required fields: candidateId, content",
          400,
        );
      }
      return handleApiError(null, "Invalid request payload", 400);
    }
    const body = parseResult.data as unknown as CandidateRequest;

    switch (body.action) {
      case "create": {
        const { name, email, position, phone, resumeUrl, source } =
          body as CreateRequest;

        const candidate = createCandidate(
          name,
          email,
          position,
          phone,
          resumeUrl,
          source,
        );

        // Save to Firestore
        await collectionRef(COLLECTIONS.RECRUITER_CANDIDATES)
          .doc(candidate.id)
          .set({
            ...candidate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: authUserId,
          });

        logger.info({ candidateId: candidate.id }, "Candidate created");

        return NextResponse.json(
          {
            success: true,
            candidate,
            message: "Candidate created successfully",
          },
          { status: 201 },
        );
      }

      case "update-priority": {
        const { candidateId, priority } = body as UpdatePriorityRequest;

        const candidateRef = collectionRef(
          COLLECTIONS.RECRUITER_CANDIDATES,
        ).doc(candidateId);
        const candidateDoc = await candidateRef.get();

        if (!candidateDoc.exists) {
          return handleApiError(null, "Candidate not found", 404);
        }

        // SECURITY: Verify ownership — recruiters can only update their own candidates
        if (candidateDoc.data()?.createdBy !== authUserId) {
          return handleApiError(null, "Forbidden: Not your candidate", 403);
        }

        const candidateData = candidateDoc.data() as Candidate;
        const updated = updateCandidatePriority(candidateData, priority);

        // Update in Firestore
        await candidateRef.update({
          priority,
          updatedAt: serverTimestamp(),
        });

        logger.info({ candidateId, priority }, "Candidate priority updated");

        return NextResponse.json(
          {
            success: true,
            candidate: { ...updated, id: candidateId },
            message: "Candidate priority updated",
          },
          { status: 200 },
        );
      }

      case "add-note": {
        const { candidateId, content, category, isPrivate } =
          body as AddNoteRequest;

        // Check candidate exists
        const candidateDoc = await collectionRef(
          COLLECTIONS.RECRUITER_CANDIDATES,
        )
          .doc(candidateId)
          .get();

        if (!candidateDoc.exists) {
          return handleApiError(null, "Candidate not found", 404);
        }

        // SECURITY: Verify ownership — recruiters can only add notes to their own candidates
        if (candidateDoc.data()?.createdBy !== authUserId) {
          return handleApiError(null, "Forbidden: Not your candidate", 403);
        }

        const note = addCandidateNote(
          candidateId,
          authUserId,
          content,
          category,
          isPrivate,
        );

        // Save note to subcollection
        await collectionRef(COLLECTIONS.RECRUITER_CANDIDATES)
          .doc(candidateId)
          .collection(NOTES_SUBCOLLECTION)
          .doc(note.id)
          .set({
            ...note,
            createdAt: serverTimestamp(),
          });

        // Get total notes count
        const notesSnap = await collectionRef(COLLECTIONS.RECRUITER_CANDIDATES)
          .doc(candidateId)
          .collection(NOTES_SUBCOLLECTION)
          .count()
          .get();

        const totalNotes = notesSnap.data().count;

        logger.info(
          { candidateId, noteId: note.id },
          "Note added to candidate",
        );

        return NextResponse.json(
          {
            success: true,
            note,
            totalNotes,
            message: "Note added successfully",
          },
          { status: 201 },
        );
      }

      default:
        return handleApiError(null, "Invalid action", 400);
    }
  } catch (error) {
    logger.error({ err: error }, "Candidates API error");
    return handleApiError(error, "Internal server error");
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId: authUserId, error: authError } =
    await getAuthenticatedUserId(request);
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const candidateId = request.nextUrl.searchParams.get("id");

    if (candidateId) {
      const candidateDoc = await collectionRef(COLLECTIONS.RECRUITER_CANDIDATES)
        .doc(candidateId)
        .get();

      if (!candidateDoc.exists) {
        return handleApiError(null, "Candidate not found", 404);
      }

      const candidateData = candidateDoc.data();

      // SECURITY: Verify ownership — recruiters can only view their own candidates
      if (candidateData?.createdBy !== authUserId) {
        return handleApiError(null, "Forbidden: Not your candidate", 403);
      }

      // Fetch notes from subcollection
      const notesSnap = await collectionRef(COLLECTIONS.RECRUITER_CANDIDATES)
        .doc(candidateId)
        .collection(NOTES_SUBCOLLECTION)
        .orderBy("createdAt", "desc")
        .get();

      const candidateNotes: CandidateNote[] = notesSnap.docs.map((doc) => {
        const n = doc.data();
        return {
          ...n,
          id: doc.id,
          createdAt: n.createdAt?.toDate() || new Date(),
        } as CandidateNote;
      });

      return NextResponse.json(
        {
          success: true,
          candidate: { ...candidateData, id: candidateId },
          notes: candidateNotes,
        },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // Return all candidates — SECURITY: Filter by ownership
    const candidatesSnap = await collectionRef(COLLECTIONS.RECRUITER_CANDIDATES)
      .where("createdBy", "==", authUserId)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const allCandidates: Candidate[] = candidatesSnap.docs.map((doc) => {
      const c = doc.data();
      return {
        ...c,
        id: doc.id,
        createdAt: c.createdAt?.toDate() || new Date(),
        updatedAt: c.updatedAt?.toDate() || new Date(),
      } as Candidate;
    });

    return NextResponse.json(
      {
        success: true,
        candidates: allCandidates,
        count: allCandidates.length,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error({ err: error }, "Candidates GET error");
    return handleApiError(error, "Internal server error");
  }
}
