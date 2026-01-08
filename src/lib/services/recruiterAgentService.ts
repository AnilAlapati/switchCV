import { generateText } from "./aiGenerationService";
import { logger } from "@/lib/logger";

interface CandidateProfile {
    name?: string;
    title?: string;
    skills?: string[];
    experience?: string; // Summary or raw text
    bio?: string;
}

interface RecruiterContext {
    recruiterName?: string;
    companyName?: string;
}

interface JobContext {
    title: string;
    description?: string; // Brief description or full JD
}

/**
 * Service to handle Recruiter Agent capabilities (Drafting, Analysis)
 */
export const RecruiterAgentService = {
    /**
     * Generates a personalized outreach message.
     */
    async generateOutreachMessage(
        candidate: CandidateProfile,
        job: JobContext,
        recruiter: RecruiterContext
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
        job: JobContext
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
};
