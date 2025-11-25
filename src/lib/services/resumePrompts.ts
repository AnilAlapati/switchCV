/**
 * AI Prompts for Conversational Resume Building
 *
 * Structured prompts that guide the AI to:
 * - Ask relevant questions
 * - Extract information systematically
 * - Return structured data when complete
 *
 * @module services/resumePrompts
 */

import { getActiveConfig, ConversationConfig } from "./conversationConfig";

/**
 * Collected resume data during conversation
 */
export interface CollectedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements?: string[];
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
    major?: string;
  }>;
  skills?: string[];
  isComplete?: boolean;
}

/**
 * System prompt for conversational resume building
 */
export const RESUME_ASSISTANT_SYSTEM_PROMPT = `You are a professional Resume Assistant AI helping someone create their resume through conversation.

Your goals:
1. Gather essential information: name, email, summary, experience, education, and skills
2. Ask clear, specific questions. Combine related questions (e.g., Name and Email) to be efficient.
3. Be encouraging and professional
4. When you have enough information, indicate completion

RESPONSE FORMAT:
- For regular conversation: Just respond naturally
- When ready to create resume: Include "RESUME_COMPLETE" in your response and provide a JSON data block

JSON FORMAT (when complete):
\`\`\`json
{
  "isComplete": true,
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "Optional phone (or N/A)",
  "location": "Optional location",
  "summary": "Professional summary",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "What they did",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "institution": "University Name",
      "year": "2020",
      "major": "Computer Science"
    }
  ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"]
}
\`\`\`

IMPORTANT RULES:
- Ask for Name and Email together in the first question if missing.
- Phone number is OPTIONAL. Ask if they want to include it (with country code) or skip it.
- Only include JSON when you have AT LEAST: name, email, and either experience OR education
- Ask follow-up questions to get details
- Be conversational and friendly
- Don't ask for everything at once (except Name/Email)
- When confirming details, repeat them clearly (e.g., "Got it: [Degree] in [Major] from [School] in [Year]" or "Added [Role] at [Company]").
- Validate email format before completing
- DO NOT hallucinate or invent skills. Only list skills explicitly mentioned by the user or clearly inferred from their experience descriptions. If no skills are mentioned, leave the array empty.
- Ensure the JSON output is valid and complete. Do not truncate the JSON.`;

/**
 * Generate initial greeting message
 */
export function getInitialGreeting(): string {
  return `Hello! I'm your AI Resume Assistant. I'll help you create a professional resume through a quick conversation.

Let's start with the basics - what's your full name and email address?`;
}

/**
 * Progress tracking for resume data collection
 */
export interface ResumeProgress {
  hasName?: boolean;
  hasEmail?: boolean;
  hasExperience?: boolean;
  hasEducation?: boolean;
  hasSkills?: boolean;
}

/**
 * Build conversational prompt for AI
 */
export function buildConversationalPrompt(
  userMessage: string,
  conversationHistory: Array<{ content: string; isUser: boolean }>,
  currentProgress?: ResumeProgress,
  collectedData?: CollectedResumeData,
  config?: Partial<ConversationConfig>,
  forceCreate?: boolean
): string {
  const activeConfig = config
    ? { ...getActiveConfig(), ...config }
    : getActiveConfig();
  const history = conversationHistory
    .slice(-activeConfig.contextWindowSize) // Use configurable context window
    .map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  let prompt = `${RESUME_ASSISTANT_SYSTEM_PROMPT}\n\n`;

  if (forceCreate) {
    prompt += `USER REQUEST: The user explicitly wants to create the resume NOW.
INSTRUCTION: Stop asking questions. Generate the "RESUME_COMPLETE" response with the JSON block immediately, using whatever information you have collected so far. If some fields are missing, leave them empty or infer them from context.\n\n`;
  }

  if (collectedData) {
    prompt += `CURRENTLY COLLECTED DATA:\n${JSON.stringify(
      collectedData,
      null,
      2
    )}\n\n`;
  }

  if (history) {
    prompt += `Previous conversation:\n${history}\n\n`;
  }

  // Add progress hints to guide AI with smart question selection for beta mode
  if (currentProgress) {
    const missing: string[] = [];
    if (!currentProgress.hasName) missing.push("name");
    if (!currentProgress.hasEmail) missing.push("email");
    if (!currentProgress.hasExperience) missing.push("work experience");
    if (!currentProgress.hasEducation) missing.push("education");
    if (!currentProgress.hasSkills) missing.push("skills");

    if (missing.length > 0) {
      // In beta mode with smart questions, limit the questions
      if (
        activeConfig.enableSmartQuestions &&
        activeConfig.maxQuestionsInBetaMode
      ) {
        const questionsAsked = conversationHistory.length;
        const remainingQuestions = Math.max(
          0,
          activeConfig.maxBetaQuestions - questionsAsked / 2
        );

        if (remainingQuestions > 0) {
          prompt += `BETA MODE: Ask ONE smart question from priority fields: ${activeConfig.priorityFields.join(
            ", "
          )}\n`;
          prompt += `REMAINING QUESTIONS ALLOWED: ${Math.ceil(
            remainingQuestions
          )}\n`;
        } else {
          prompt += `BETA MODE: Maximum questions reached (${activeConfig.maxBetaQuestions}). Offer to create resume.\n`;
          prompt += `MISSING INFO: ${missing.join(", ")}\n`;
          prompt += `Ask: "I have good information. Shall I create your resume now, or add more details?"\n`;
        }
      } else {
        prompt += `MISSING INFO: ${missing.join(", ")}\n`;
      }
    } else {
      prompt += `INFO COMPLETE: All required information collected. You can now create the resume.\n`;
    }
  }

  prompt += `\nUser's latest message: "${userMessage}"\n\n`;
  prompt += `Your response (be conversational and ask one question at a time):`;

  return prompt;
}

/**
 * Build prompt for final resume creation
 */
export function buildResumeCreationPrompt(
  collectedData: CollectedResumeData
): string {
  return `Based on the following information, create a professional resume:

${JSON.stringify(collectedData, null, 2)}

Return ONLY a JSON object in this exact format:
\`\`\`json
{
  "isComplete": true,
  "name": "${collectedData.name || ""}",
  "email": "${collectedData.email || ""}",
  "phone": "${collectedData.phone || ""}",
  "location": "${collectedData.location || ""}",
  "summary": "A professional summary (write one if not provided)",
  "experience": ${JSON.stringify(collectedData.experience || [])},
  "education": ${JSON.stringify(collectedData.education || [])},
  "skills": ${JSON.stringify(collectedData.skills || [])}
}
\`\`\``;
}

/**
 * Validate if response indicates completion
 */
export function isCompletionResponse(response: string): boolean {
  const completionIndicators = [
    "RESUME_COMPLETE",
    "resume is complete",
    "ready to create your resume",
    "have all the information",
    "```json",
  ];

  return completionIndicators.some((indicator) =>
    response.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Extract JSON from completion response
 */
export function extractResumeJSON(
  response: string
): CollectedResumeData | null {
  try {
    // Look for JSON code blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = response.match(jsonBlockRegex);

    if (match && match[1]) {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.isComplete) {
        return parsed;
      }
    }
  } catch {
    // JSON parsing failed
  }

  return null;
}

/**
 * Get follow-up question based on missing information
 */
export function getFollowUpQuestion(missingFields: string[]): string {
  const questions: Record<string, string> = {
    name: "To get started, what's your full name and email address?",
    email: "What email address should we include on your resume?",
    phone:
      "Would you like to add a phone number? It's optional - you can say 'skip' or 'N/A' if you prefer not to share it.",
    location: "What city are you located in? (Optional)",
    summary:
      "Tell me a bit about yourself and your career goals. What kind of position are you seeking?",
    experience:
      "Let's talk about your work experience. What's your most recent or current job? Please share the title, company, and what you do there.",
    education:
      "What about your education? Tell me about your degree and where you studied.",
    skills:
      "What are your key professional skills? Think about both technical skills and soft skills you'd want to highlight.",
  };

  const field = missingFields[0];
  return (
    questions[field] ||
    `I need more information about your ${field}. Can you tell me about it?`
  );
}

/**
 * Generate encouragement message based on progress
 */
export function getProgressMessage(completionPercentage: number): string {
  if (completionPercentage < 25) {
    return "Great start! Let's gather a bit more information.";
  } else if (completionPercentage < 50) {
    return "We're making good progress! Just a few more details.";
  } else if (completionPercentage < 75) {
    return "Excellent! We're almost there.";
  } else if (completionPercentage < 100) {
    return "Almost done! Just one or two more things.";
  } else {
    return "Perfect! I have everything I need to create your resume.";
  }
}
