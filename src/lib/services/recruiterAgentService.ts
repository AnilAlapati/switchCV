import { generateText } from "./aiGenerationService";
import { logger } from "@/lib/logger";

interface CandidateProfile {
  name?: string;
  title?: string;
  skills?: string[];
  experience?: string; // Summary or raw text
  bio?: string;
  resumeId?: string;
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
  ): Promise<string> {
    try {
      const prompt = `
        You are an expert Executive Recruiter.
        Draft a personalized, professional, and engaging connection request or cold email to a candidate.
        
        CANDIDATE:
        Name: ${candidate.name || "Candidate"}
        Title: ${candidate.title || "Unknown"}
        Skills: ${candidate.skills?.join(", ") || "N/A"}
        Bio/Exp: ${candidate.bio || candidate.experience || "N/A"}

        JOB ID/CONTEXT:
        Role: ${job.title}
        Context: ${job.description || "N/A"}

        SENDER (Recruiter):
        Name: ${recruiter.recruiterName || "Hiring Manager"}
        Company: ${recruiter.companyName || "Our Company"}

        INSTRUCTIONS:
        1. Keep it concise (under 200 words).
        2. Reference specific skills or experience from the candidate's profile to show you actually read it.
        3. Explain why they are a good fit for *this* specific job.
        4. End with a clear call to action.
        5. Tone: Professional, warm, exclusive.
        6. Return ONLY the message body. Do not include subject lines or "Here is the email" headers.
      `;

      const result = await generateText(prompt, 1000, 0.7, "gemini-1.5-pro");
      return result.text;
    } catch (error) {
      logger.error({ err: error }, "Failed to generate outreach message");
      throw new Error("Failed to generate message");
    }
  },

  /**
   * Analyzes the match between a candidate and a job.
   */
  async analyzeMatch(
    candidate: CandidateProfile,
    job: JobContext,
  ): Promise<string> {
    try {
      const prompt = `
        You are an AI Talent Assessor.
        Analyze the fit between this Candidate and this Job.

        CANDIDATE:
        Title: ${candidate.title || "Unknown"}
        Skills: ${candidate.skills?.join(", ") || "N/A"}
        Bio: ${candidate.bio || candidate.experience || "N/A"}

        JOB:
        Role: ${job.title}
        Desc: ${job.description || "N/A"}

        INSTRUCTIONS:
        1. Provide a bulleted list of 3-4 reasons why this is a good (or bad) match.
        2. Be honest. If they lack key skills, mention it.
        3. Keep it very brief (under 100 words).
        4. Format as Markdown.
      `;

      const result = await generateText(prompt, 600, 0.5, "gemini-1.5-flash");
      return result.text;
    } catch (error) {
      logger.error({ err: error }, "Failed to analyze match");
      throw new Error("Failed to analyze match");
    }
  },

  /**
   * Screens candidates against specific criteria and returns a ranked assessment.
   */
  async screenCandidate(
    candidate: CandidateProfile,
    criteria: ScreeningCriteria,
  ): Promise<{
    score: number;
    summary: string;
    flags: string[];
    highlights: string[];
  }> {
    try {
      const prompt = `
        You are an AI Screening Agent for recruiting.
        Evaluate this candidate against the screening criteria and provide a structured assessment.

        CANDIDATE:
        Name: ${candidate.name || "Unknown"}
        Title: ${candidate.title || "Unknown"}
        Skills: ${candidate.skills?.join(", ") || "N/A"}
        Experience: ${candidate.experience || candidate.bio || "N/A"}

        SCREENING CRITERIA:
        Must-Have Skills: ${criteria.mustHave.join(", ")}
        Nice-to-Have Skills: ${criteria.niceToHave?.join(", ") || "None specified"}
        Years of Experience Required: ${criteria.yearsExperience || "Not specified"}
        Location Requirement: ${criteria.location || "Not specified"}

        INSTRUCTIONS:
        Return a JSON object (no markdown, just pure JSON) with:
        {
          "score": <number 0-100 based on match to must-haves and nice-to-haves>,
          "summary": "<2-3 sentence assessment>",
          "flags": ["<potential concerns or gaps>"],
          "highlights": ["<standout qualifications>"]
        }
      `;

      const result = await generateText(prompt, 500, 0.3, "gemini-1.5-flash");

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
  ): Promise<{ questions: string[]; brief: string; areasToProbe: string[] }> {
    try {
      const interviewType = request.interviewType || "general";
      const prompt = `
        You are an AI Interview Preparation Agent.
        Generate interview preparation materials for the hiring manager.

        CANDIDATE:
        Name: ${request.candidate.name || "Candidate"}
        Title: ${request.candidate.title || "Unknown"}
        Skills: ${request.candidate.skills?.join(", ") || "N/A"}
        Experience: ${request.candidate.experience || request.candidate.bio || "N/A"}

        JOB:
        Role: ${request.job.title}
        Description: ${request.job.description || "N/A"}
        Requirements: ${request.job.requirements?.join(", ") || "N/A"}

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

      const result = await generateText(prompt, 1200, 0.6, "gemini-1.5-pro");

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
  ): Promise<{
    suggestedAction: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
  }> {
    try {
      const prompt = `
        You are an AI Pipeline Manager for recruiting.
        Suggest the best next action for this candidate.

        CANDIDATE:
        Name: ${candidate.name || "Unknown"}
        Title: ${candidate.title || "Unknown"}
        Current Pipeline Stage: ${currentStage}

        INTERACTION HISTORY:
        ${interactionHistory || "No previous interactions recorded"}

        INSTRUCTIONS:
        Based on the current stage and history, suggest the most appropriate next action.
        Return a JSON object (no markdown, just pure JSON):
        {
          "suggestedAction": "<specific action like 'Schedule technical interview', 'Send follow-up email', 'Move to offer stage'>",
          "reasoning": "<1-2 sentences explaining why this action>",
          "priority": "<high|medium|low based on urgency>"
        }
      `;

      const result = await generateText(prompt, 400, 0.4, "gemini-1.5-flash");

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
  async enhanceJobDescription(job: JobContext): Promise<{
    enhancedDescription: string;
    suggestedRequirements: string[];
    searchKeywords: string[];
  }> {
    try {
      const prompt = `
        You are an AI Job Description Optimizer.
        Enhance this job posting to attract better candidates and improve search matching.

        CURRENT JOB:
        Title: ${job.title}
        Description: ${job.description || "N/A"}
        Requirements: ${job.requirements?.join(", ") || "N/A"}
        Location: ${job.location || "N/A"}

        INSTRUCTIONS:
        Return a JSON object (no markdown, just pure JSON):
        {
          "enhancedDescription": "<improved job description that's more engaging and specific>",
          "suggestedRequirements": ["<list of recommended must-have and nice-to-have requirements>"],
          "searchKeywords": ["<keywords that will help find matching candidates>"]
        }
      `;

      const result = await generateText(prompt, 800, 0.6, "gemini-1.5-pro");

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
