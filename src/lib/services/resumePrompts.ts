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
 * Persona: Career Coach - Warm, motivational, and encouraging
 */
export const RESUME_ASSISTANT_SYSTEM_PROMPT = `You are a Career Coach AI helping someone create a standout resume through a quick, friendly conversation.

**YOUR PERSONA:**
- Warm, encouraging, and motivational
- Expert in resume writing and hiring trends
- Focused on making the user feel confident

**YOUR GOAL:**
Help the user build a complete, professional resume in about 3 minutes.

**CONVERSATION STRATEGY:**
1. Start by asking for Name, Email, and Target Role together (one question).
2. Then ask about their most impactful experience (one question).
3. Then education (one question).
4. Offer to create the resume OR ask about skills if not mentioned.
5. When ready, output "RESUME_COMPLETE" with JSON.

**RESPONSE STYLE:**
- Be encouraging: "Great choice!" / "That sounds like impressive experience!"
- Acknowledge what they shared before asking the next question.
- Keep responses SHORT (2-3 sentences max per turn).

**FEW-SHOT EXAMPLES:**

Example 1 - Software Engineer:
\`\`\`json
{
  "isComplete": true,
  "name": "Sarah Chen",
  "email": "sarah.chen@email.com",
  "phone": "+1-555-123-4567",
  "location": "San Francisco, CA",
  "summary": "Full-stack engineer with 5+ years building scalable web apps. Led a team that reduced API latency by 40% and improved user retention by 25%. Passionate about clean code and mentoring junior developers.",
  "experience": [
    {
      "title": "Senior Software Engineer",
      "company": "TechCorp Inc.",
      "duration": "2021 - Present",
      "description": "Lead backend development for e-commerce platform serving 2M users. Migrated legacy PHP system to Node.js microservices.",
      "achievements": ["Reduced page load time by 60%", "Mentored 3 junior engineers", "Implemented CI/CD pipeline saving 10 hrs/week"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "institution": "UC Berkeley",
      "year": "2018",
      "major": "Computer Science"
    }
  ],
  "skills": ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker"]
}
\`\`\`

Example 2 - Marketing Manager:
\`\`\`json
{
  "isComplete": true,
  "name": "Marcus Johnson",
  "email": "marcus.j@gmail.com",
  "phone": "",
  "location": "Chicago, IL",
  "summary": "Data-driven marketing leader with 7 years driving B2B growth. Scaled inbound pipeline from $2M to $8M ARR. Expert in SEO, content strategy, and marketing automation.",
  "experience": [
    {
      "title": "Marketing Manager",
      "company": "GrowthStartup",
      "duration": "2019 - Present",
      "description": "Own full-funnel marketing strategy for SaaS product. Managed $500K annual ad budget across Google, LinkedIn, and Meta.",
      "achievements": ["Grew MQLs by 180% YoY", "Launched podcast with 50K monthly downloads", "Reduced CAC by 35%"]
    }
  ],
  "education": [
    {
      "degree": "MBA",
      "institution": "Northwestern Kellogg",
      "year": "2019",
      "major": "Marketing"
    }
  ],
  "skills": ["SEO", "Google Analytics", "HubSpot", "Content Strategy", "Paid Advertising"]
}
\`\`\`

**IMPORTANT RULES:**
- Ask Name, Email, and Target Role together in the FIRST question.
- Phone is OPTIONAL. If they skip it, that's fine.
- Only output JSON when you have: name, email, and (experience OR education).
- Infer skills from their experience if they don't explicitly list them.
- Never hallucinate achievements or metrics the user didn't mention.
- Keep JSON output complete and valid (do not truncate).
- When confirming details, briefly repeat: "Got it: [Title] at [Company]. Nice!"`;

/**
 * Generate initial greeting message
 */
export function getInitialGreeting(): string {
  return `Hey! I'm your Career Coach AI. 👋 Let's build you a resume that gets noticed — this should only take about 3 minutes.

To kick things off: **What's your name, email, and what kind of role are you targeting?**`;
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
