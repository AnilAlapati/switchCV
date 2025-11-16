/**
 * Recruiter Candidates API Route
 * POST /api/recruiter/candidates
 * Handles candidate CRUD operations and queries
 */

import { NextRequest, NextResponse } from "next/server";
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
  userId: string;
  content: string;
  category?: string;
  isPrivate?: boolean;
}

type CandidateRequest = CreateRequest | UpdatePriorityRequest | AddNoteRequest;

// In-memory candidate storage (replace with database in production)
const candidates = new Map<string, Candidate>();
const notes = new Map<string, CandidateNote[]>();

export async function POST(request: NextRequest) {
  try {
    const body: CandidateRequest = await request.json();

    switch (body.action) {
      case "create": {
        const { name, email, position, phone, resumeUrl, source } =
          body as CreateRequest;

        if (!name || !email || !position) {
          return NextResponse.json(
            { error: "Missing required fields: name, email, position" },
            { status: 400 }
          );
        }

        const candidate = createCandidate(
          name,
          email,
          position,
          phone,
          resumeUrl,
          source
        );
        candidates.set(candidate.id, candidate);

        return NextResponse.json(
          {
            success: true,
            candidate,
            message: "Candidate created successfully",
          },
          { status: 201 }
        );
      }

      case "update-priority": {
        const { candidateId, priority } = body as UpdatePriorityRequest;
        const candidate = candidates.get(candidateId);

        if (!candidate) {
          return NextResponse.json(
            { error: "Candidate not found" },
            { status: 404 }
          );
        }

        const updated = updateCandidatePriority(candidate, priority);
        candidates.set(candidateId, updated);

        return NextResponse.json(
          {
            success: true,
            candidate: updated,
            message: "Candidate priority updated",
          },
          { status: 200 }
        );
      }

      case "add-note": {
        const { candidateId, userId, content, category, isPrivate } =
          body as AddNoteRequest;

        if (!candidateId || !userId || !content) {
          return NextResponse.json(
            { error: "Missing required fields: candidateId, userId, content" },
            { status: 400 }
          );
        }

        const candidate = candidates.get(candidateId);
        if (!candidate) {
          return NextResponse.json(
            { error: "Candidate not found" },
            { status: 404 }
          );
        }

        const note = addCandidateNote(
          candidateId,
          userId,
          content,
          category,
          isPrivate
        );

        const candidateNotes = notes.get(candidateId) || [];
        candidateNotes.push(note);
        notes.set(candidateId, candidateNotes);

        return NextResponse.json(
          {
            success: true,
            note,
            totalNotes: candidateNotes.length,
            message: "Note added successfully",
          },
          { status: 201 }
        );
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Candidates API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const candidateId = request.nextUrl.searchParams.get("id");

    if (candidateId) {
      const candidate = candidates.get(candidateId);
      if (!candidate) {
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      const candidateNotes = notes.get(candidateId) || [];
      return NextResponse.json(
        {
          success: true,
          candidate,
          notes: candidateNotes,
        },
        { status: 200 }
      );
    }

    // Return all candidates
    const allCandidates = Array.from(candidates.values());
    return NextResponse.json(
      {
        success: true,
        candidates: allCandidates,
        count: allCandidates.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET Candidates API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
