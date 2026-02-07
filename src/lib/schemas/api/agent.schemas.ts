import { z } from "zod";

// ─── Shared sub-schemas for agent routes ───────────────────────────────────────

const CandidateSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    skills: z.array(z.string()).optional(),
    bio: z.string().optional(),
    experience: z.string().optional(),
    education: z.string().optional(),
    resumeText: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough(); // Allow extra fields from AI-enriched candidate objects

const JobSchema = z
  .object({
    title: z.string().min(1, "Job title is required"),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    location: z.string().optional(),
    company: z.string().optional(),
    salary: z.string().optional(),
  })
  .passthrough();

// ─── Analyze Match ─────────────────────────────────────────────────────────────

export const AgentAnalyzeSchema = z.object({
  candidate: CandidateSchema,
  job: JobSchema,
});

// ─── Enhance Job ───────────────────────────────────────────────────────────────

export const AgentEnhanceJobSchema = z.object({
  job: JobSchema,
});

// ─── Interview Prep ────────────────────────────────────────────────────────────

export const AgentInterviewPrepSchema = z.object({
  candidate: CandidateSchema,
  job: JobSchema,
  interviewType: z
    .enum(["general", "technical", "behavioral", "cultural"])
    .optional()
    .default("general"),
});

// ─── Screen Candidate ──────────────────────────────────────────────────────────

const ScreeningCriteriaSchema = z
  .object({
    mustHave: z
      .array(z.string())
      .min(1, "Must provide at least one must-have requirement"),
    niceToHave: z.array(z.string()).optional(),
    dealBreakers: z.array(z.string()).optional(),
    experienceYears: z.number().optional(),
    location: z.string().optional(),
  })
  .passthrough();

export const AgentScreenSchema = z.object({
  candidate: CandidateSchema,
  criteria: ScreeningCriteriaSchema,
});

// ─── Pipeline Suggest ──────────────────────────────────────────────────────────

export const AgentPipelineSuggestSchema = z.object({
  candidate: CandidateSchema,
  currentStage: z.string().min(1, "Current stage is required"),
  interactionHistory: z.string().optional(),
});

// ─── Outreach (already exists inline in route, re-export for consistency) ──────

export const AgentOutreachSchema = z.object({
  candidate: CandidateSchema,
  job: JobSchema,
  recruiter: z
    .object({
      recruiterName: z.string().optional(),
      companyName: z.string().optional(),
    })
    .optional(),
});
