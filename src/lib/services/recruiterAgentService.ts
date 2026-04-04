import { generateText } from "./aiGenerationService";
import { logger } from "@/lib/logger";
import { DEFAULT_MODEL } from "@/lib/config/aiModels";
import {
  sanitizeForPrompt,
  containsPromptInjection,
} from "@/lib/utils/promptSafety";
import {
  retrieveRelevantChunks,
  buildContextFromChunks,
} from "@/lib/services/rag/retrievalService";
import type { ResumeProfile } from "@/types";

interface CandidateProfile {
  name?: string;
  title?: string;
  skills?: string[];
  experience?: string; // Summary or raw text
  bio?: string;
  resumeId?: string;
  /** Structured resume profile — enables RAG-based context retrieval */
  resumeProfile?: ResumeProfile;
}

interface RecruiterContext {
  recruiterName?: string;
  companyName?: string;
}

interface JobContext {
  title: string;
  description?: string; // Brief description or full JD
  requirements?: string[];
  location?: string;
}

interface ScreeningCriteria {
  mustHave: string[];
  niceToHave?: string[];
  yearsExperience?: number;
  location?: string;
}

interface InterviewPrepRequest {
  candidate: CandidateProfile;
  job: JobContext;
  interviewType?: "technical" | "behavioral" | "cultural" | "general";
}

/**
 * Sanitize candidate/job text for safe inclusion in AI prompts.
 * Uses shorter max length for names/titles (100) and longer for descriptions/bios (2000).
 */
function sanitizeField(value: string | undefined, maxLength = 100): string {
  if (!value) return "N/A";
  return sanitizeForPrompt(value, maxLength);
}

/**
 * Sanitize an array of strings for prompt inclusion.
 */
function sanitizeArray(arr: string[] | undefined, maxLenPerItem = 100): string {
  if (!arr || arr.length === 0) return "N/A";
  return arr.map((item) => sanitizeForPrompt(item, maxLenPerItem)).join(", ");
}

/**
 * Log a warning if any user-provided text contains prompt injection patterns.
 * We still proceed (after sanitization) but log for security monitoring.
 */
function checkInjection(fields: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value && containsPromptInjection(value)) {
      logger.warn(
        { field: key, length: value.length },
        "Potential prompt injection detected in recruiter agent input",
      );
    }
  }
}

/**
 * Service to handle Recruiter Agent capabilities
 *
 * Two-Agent System:
 * 1. Requirement Agent - Understands hiring needs, extracts criteria, prepares search parameters
 * 2. Smart Search Agent - Searches database, analyzes profiles, ranks matches
 *
 * Methods map to agent capabilities:
 * - Requirement Agent: enhanceJobDescription (understanding requirements)
 * - Smart Search Agent: analyzeMatch, screenCandidate (profile analysis & ranking)
 * - Extended features: generateOutreachMessage, generateInterviewPrep, suggestPipelineAction
 */
export const RecruiterAgentService = {
  /**
   * Generates a personalized outreach message.
   */
  async generateOutreachMessage(
    candidate: CandidateProfile,
    job: JobContext,
    recruiter: RecruiterContext,
    model: string = DEFAULT_MODEL,
  ): Promise<string> {
    try {
      // Prompt injection check (log only — sanitization handles safety)
      checkInjection({
        candidateName: candidate.name,
        candidateBio: candidate.bio,
        candidateExperience: candidate.experience,
        jobTitle: job.title,
        jobDescription: job.description,
      });

      const prompt = `
        You are an expert Executive Recruiter.
        Draft a personalized, professional, and engaging connection request or cold email to a candidate.
        
        CANDIDATE:
        Name: ${sanitizeField(candidate.name)}
        Title: ${sanitizeField(candidate.title)}
        Skills: ${sanitizeArray(candidate.skills)}
        Bio/Exp: ${sanitizeField(candidate.bio || candidate.experience, 2000)}

        JOB ID/CONTEXT:
        Role: ${sanitizeField(job.title, 200)}
        Context: ${sanitizeField(job.description, 2000)}

        SENDER (Recruiter):
        Name: ${sanitizeField(recruiter.recruiterName || "Hiring Manager")}
        Company: ${sanitizeField(recruiter.companyName || "Our Company", 200)}

        INSTRUCTIONS:
        1. Keep it concise (under 200 words).
        2. Reference specific skills or experience from the candidate's profile to show you actually read it.
        3. Explain why they are a good fit for *this* specific job.
        4. End with a clear call to action.
        5. Tone: Professional, warm, exclusive.
        6. Return ONLY the message body. Do not include subject lines or "Here is the email" headers.
      `;

      const result = await generateText(prompt, 1000, 0.7, model);
      return result.text;
    } catch (error) {
      logger.error({ err: error }, "Failed to generate outreach message");
      throw new Error("Failed to generate message");
    }
  },

  /**
   * Analyzes the match between a candidate and a job.
   *
   * If `candidate.resumeProfile` is provided, uses RAG to retrieve only the
   * sections of the resume most relevant to the job description — avoiding
   * sending the full resume to the LLM and reducing hallucination.
   */
  async analyzeMatch(
    candidate: CandidateProfile,
    job: JobContext,
    model: string = DEFAULT_MODEL,
  ): Promise<string> {
    try {
      checkInjection({
        candidateBio: candidate.bio,
        candidateExperience: candidate.experience,
        jobTitle: job.title,
        jobDescription: job.description,
      });

      // Build candidate context using RAG when structured resume is available
      let candidateContext: string;
      if (candidate.resumeProfile && candidate.resumeId) {
        const query = [job.title, job.description, ...(job.requirements ?? [])]
          .filter(Boolean)
          .join(" ");

        const chunks = await retrieveRelevantChunks(
          query,
          candidate.resumeId,
          candidate.resumeProfile,
          5,
          0.25,
        );

        candidateContext =
          chunks.length > 0
            ? buildContextFromChunks(chunks)
            : sanitizeField(candidate.bio || candidate.experience, 2000);

        logger.info(
          { resumeId: candidate.resumeId, chunksUsed: chunks.length },
          "analyzeMatch: using RAG context",
        );
      } else {
        candidateContext = sanitizeField(
          candidate.bio || candidate.experience,
          2000,
        );
      }

      const prompt = `
        You are an AI Talent Assessor.
        Analyze the fit between this Candidate and this Job.

        CANDIDATE:
        Title: ${sanitizeField(candidate.title)}
        Skills: ${sanitizeArray(candidate.skills)}
        Relevant Background:
${candidateContext}

        JOB:
        Role: ${sanitizeField(job.title, 200)}
        Desc: ${sanitizeField(job.description, 2000)}

        INSTRUCTIONS:
        1. Provide a bulleted list of 3-4 reasons why this is a good (or bad) match.
        2. Be honest. If they lack key skills, mention it.
        3. Keep it very brief (under 100 words).
        4. Format as Markdown.
      `;

      const result = await generateText(prompt, 600, 0.5, model);
      return result.text;
    } catch (error) {
      logger.error({ err: error }, "Failed to analyze match");
      throw new Error("Failed to analyze match");
    }
  },

  /**
   * Screens candidates against specific criteria and returns a ranked assessment.
   *
   * Uses RAG to retrieve only the most relevant experience sections when
   * `candidate.resumeProfile` is available, rather than truncating to 2000
   * characters of raw text.
   */
  async screenCandidate(
    candidate: CandidateProfile,
    criteria: ScreeningCriteria,
    model: string = DEFAULT_MODEL,
  ): Promise<{
    score: number;
    summary: string;
    flags: string[];
    highlights: string[];
  }> {
    try {
      checkInjection({
        candidateName: candidate.name,
        candidateExperience: candidate.experience,
        candidateBio: candidate.bio,
      });

      // Build screening context via RAG when structured resume is available
      let experienceContext: string;
      if (candidate.resumeProfile && candidate.resumeId) {
        const query = [
          "experience skills background",
          ...criteria.mustHave,
          ...(criteria.niceToHave ?? []),
        ].join(" ");

        const chunks = await retrieveRelevantChunks(
          query,
          candidate.resumeId,
          candidate.resumeProfile,
          6,
          0.2,
        );

        experienceContext =
          chunks.length > 0
            ? buildContextFromChunks(chunks)
            : sanitizeField(candidate.experience || candidate.bio, 2000);

        logger.info(
          { resumeId: candidate.resumeId, chunksUsed: chunks.length },
          "screenCandidate: using RAG context",
        );
      } else {
        experienceContext = sanitizeField(
          candidate.experience || candidate.bio,
          2000,
        );
      }

      const prompt = `
        You are an AI Screening Agent for recruiting.
        Evaluate this candidate against the screening criteria and provide a structured assessment.

        CANDIDATE:
        Name: ${sanitizeField(candidate.name)}
        Title: ${sanitizeField(candidate.title)}
        Skills: ${sanitizeArray(candidate.skills)}
        Relevant Experience:
${experienceContext}

        SCREENING CRITERIA:
        Must-Have Skills: ${sanitizeArray(criteria.mustHave)}
        Nice-to-Have Skills: ${sanitizeArray(criteria.niceToHave) || "None specified"}
        Years of Experience Required: ${criteria.yearsExperience || "Not specified"}
        Location Requirement: ${sanitizeField(criteria.location)}

        INSTRUCTIONS:
        Return a JSON object (no markdown, just pure JSON) with:
        {
          "score": <number 0-100 based on match to must-haves and nice-to-haves>,
          "summary": "<2-3 sentence assessment>",
          "flags": ["<potential concerns or gaps>"],
          "highlights": ["<standout qualifications>"]
        }
      `;

      const result = await generateText(prompt, 500, 0.3, model);

      // Parse the JSON response
      try {
        const parsed = JSON.parse(result.text.trim());
        return {
          score: parsed.score || 0,
          summary: parsed.summary || "Unable to assess",
          flags: parsed.flags || [],
          highlights: parsed.highlights || [],
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          score: 50,
          summary: result.text.slice(0, 200),
          flags: [],
          highlights: [],
        };
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to screen candidate");
      throw new Error("Failed to screen candidate");
    }
  },

  /**
   * Generates interview questions and a candidate brief.
   */
  async generateInterviewPrep(
    request: InterviewPrepRequest,
    model: string = DEFAULT_MODEL,
  ): Promise<{ questions: string[]; brief: string; areasToProbe: string[] }> {
    try {
      const interviewType = request.interviewType || "general";

      checkInjection({
        candidateName: request.candidate.name,
        candidateExperience: request.candidate.experience,
        candidateBio: request.candidate.bio,
        jobTitle: request.job.title,
        jobDescription: request.job.description,
      });

      const prompt = `
        You are an AI Interview Preparation Agent.
        Generate interview preparation materials for the hiring manager.

        CANDIDATE:
        Name: ${sanitizeField(request.candidate.name)}
        Title: ${sanitizeField(request.candidate.title)}
        Skills: ${sanitizeArray(request.candidate.skills)}
        Experience: ${sanitizeField(request.candidate.experience || request.candidate.bio, 2000)}

        JOB:
        Role: ${sanitizeField(request.job.title, 200)}
        Description: ${sanitizeField(request.job.description, 2000)}
        Requirements: ${sanitizeArray(request.job.requirements)}

        INTERVIEW TYPE: ${interviewType}

        INSTRUCTIONS:
        Return a JSON object (no markdown, just pure JSON) with:
        {
          "questions": ["<10 tailored interview questions based on the candidate's background and job requirements>"],
          "brief": "<A 3-4 sentence executive summary of the candidate highlighting their key qualifications and potential fit>",
          "areasToProbe": ["<3-5 specific areas to dig deeper based on resume gaps or interesting experiences>"]
        }

        For ${interviewType} interviews, focus questions on:
        - technical: coding skills, system design, technical problem-solving
        - behavioral: past experiences, teamwork, leadership, conflict resolution
        - cultural: values alignment, work style, motivation
        - general: mix of all areas
      `;

      const result = await generateText(prompt, 1200, 0.6, model);

      try {
        const parsed = JSON.parse(result.text.trim());
        return {
          questions: parsed.questions || [],
          brief: parsed.brief || "Unable to generate brief",
          areasToProbe: parsed.areasToProbe || [],
        };
      } catch {
        return {
          questions: [
            "Tell me about yourself",
            "Why are you interested in this role?",
          ],
          brief: result.text.slice(0, 300),
          areasToProbe: ["Background verification", "Skills assessment"],
        };
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to generate interview prep");
      throw new Error("Failed to generate interview prep");
    }
  },

  /**
   * Suggests next actions for a candidate in the pipeline.
   */
  async suggestPipelineAction(
    candidate: CandidateProfile,
    currentStage: string,
    interactionHistory?: string,
    model: string = DEFAULT_MODEL,
  ): Promise<{
    suggestedAction: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
  }> {
    try {
      checkInjection({
        candidateName: candidate.name,
        candidateTitle: candidate.title,
        interactionHistory,
      });

      const prompt = `
        You are an AI Pipeline Manager for recruiting.
        Suggest the best next action for this candidate.

        CANDIDATE:
        Name: ${sanitizeField(candidate.name)}
        Title: ${sanitizeField(candidate.title)}
        Current Pipeline Stage: ${sanitizeField(currentStage, 200)}

        INTERACTION HISTORY:
        ${sanitizeField(interactionHistory, 2000)}

        INSTRUCTIONS:
        Based on the current stage and history, suggest the most appropriate next action.
        Return a JSON object (no markdown, just pure JSON):
        {
          "suggestedAction": "<specific action like 'Schedule technical interview', 'Send follow-up email', 'Move to offer stage'>",
          "reasoning": "<1-2 sentences explaining why this action>",
          "priority": "<high|medium|low based on urgency>"
        }
      `;

      const result = await generateText(prompt, 400, 0.4, model);

      try {
        const parsed = JSON.parse(result.text.trim());
        return {
          suggestedAction: parsed.suggestedAction || "Review candidate",
          reasoning: parsed.reasoning || "Standard pipeline progression",
          priority: parsed.priority || "medium",
        };
      } catch {
        return {
          suggestedAction: "Review and take action",
          reasoning: result.text.slice(0, 150),
          priority: "medium",
        };
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to suggest pipeline action");
      throw new Error("Failed to suggest pipeline action");
    }
  },

  /**
   * Enhances a job description for better candidate matching.
   */
  async enhanceJobDescription(
    job: JobContext,
    model: string = DEFAULT_MODEL,
  ): Promise<{
    enhancedDescription: string;
    suggestedRequirements: string[];
    searchKeywords: string[];
  }> {
    try {
      checkInjection({
        jobTitle: job.title,
        jobDescription: job.description,
      });

      const prompt = `
        You are an AI Job Description Optimizer.
        Enhance this job posting to attract better candidates and improve search matching.

        CURRENT JOB:
        Title: ${sanitizeField(job.title, 200)}
        Description: ${sanitizeField(job.description, 2000)}
        Requirements: ${sanitizeArray(job.requirements)}
        Location: ${sanitizeField(job.location, 200)}

        INSTRUCTIONS:
        Return a JSON object (no markdown, just pure JSON):
        {
          "enhancedDescription": "<improved job description that's more engaging and specific>",
          "suggestedRequirements": ["<list of recommended must-have and nice-to-have requirements>"],
          "searchKeywords": ["<keywords that will help find matching candidates>"]
        }
      `;

      const result = await generateText(prompt, 800, 0.6, model);

      try {
        const parsed = JSON.parse(result.text.trim());
        return {
          enhancedDescription:
            parsed.enhancedDescription || job.description || "",
          suggestedRequirements: parsed.suggestedRequirements || [],
          searchKeywords: parsed.searchKeywords || [],
        };
      } catch {
        return {
          enhancedDescription: job.description || "",
          suggestedRequirements: job.requirements || [],
          searchKeywords: [job.title],
        };
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to enhance job description");
      throw new Error("Failed to enhance job description");
    }
  },
};
