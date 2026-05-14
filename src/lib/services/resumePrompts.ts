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
  github?: string;
  linkedin?: string;
  twitter?: string;
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
    grade?: string;
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

**CRITICAL RULE — CURRENTLY COLLECTED DATA IS THE GROUND TRUTH:**
- A dedicated extraction AI (Gemini 2.5 Pro with structured output) processes every user message and populates the CURRENTLY COLLECTED DATA section. **NEVER ask for any field that is already present in CURRENTLY COLLECTED DATA** — not even to "confirm" it, not even if the user's wording was casual or indirect.
- If "name" is in CURRENTLY COLLECTED DATA, you HAVE the name. If "phone" is there, you HAVE the phone. Act on it.
- Instead of asking, confirm what you captured: "Got it: S.B.C.E, 2010-2014, E.C.E with 7.2 CGPA."
- If a detail in CURRENTLY COLLECTED DATA is ambiguous (e.g. an institution abbreviation), ask a TARGETED clarification (e.g. "Is S.B.C.E the full institution name?") — never re-ask the whole field.
- Users get frustrated when they have to repeat themselves. This is the #1 priority.

**BULK INPUT HANDLING:**
- If the user pastes a large block of text containing multiple work experiences, certifications, education entries, or skills — ABSORB ALL OF IT in one go.
- Do NOT cherry-pick one item and ask about the rest. Process the entire paste.
- **Also capture contact info embedded anywhere in the paste**: phone numbers, email addresses, LinkedIn/GitHub/portfolio URLs, and location. These often appear at the top or bottom of a pasted resume — extract them too.
- Confirm everything you captured in a brief summary: "Great! I've captured 4 roles (JPMC, TEKsystems, IBM), 5 certifications, 16 skills, your LinkedIn, and phone number."
- Then ask if they want to add anything else or if you should create the resume.
- **Never ask for phone, LinkedIn, or email that were already present in the pasted text.**

**FEW-SHOT EXAMPLES:**

Example 1 - Software Engineer:
\`\`\`json
{
  "isComplete": true,
  "name": "Sarah Chen",
  "email": "sarah.chen@email.com",
  "phone": "+1-555-123-4567",
  "location": "San Francisco, CA",
  "github": "https://github.com/sarahchen",
  "linkedin": "https://linkedin.com/in/sarahchen",
  "twitter": "",
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
      "major": "Computer Science",
      "grade": "3.8/4.0 GPA"
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
  "github": "",
  "linkedin": "https://linkedin.com/in/marcusjohnson",
  "twitter": "https://x.com/marcusj",
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
      "major": "Marketing",
      "grade": ""
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
- Never hallucinate achievements, metrics, or dates the user didn't mention. If no start date was given, leave startDate empty — NEVER invent a date.
- NEVER use the user's conversational phrases (e.g. "ok", "hey", "create resume", "this is great") as their name. Treat CURRENTLY COLLECTED DATA as the authoritative source for name and all other fields — a dedicated AI extraction system already processed every user message.
- A single first name is valid and sufficient. **Never interrupt the conversation flow to ask for a last name** — simply proceed with what was given.
- Keep JSON output complete and valid (do not truncate).
- When confirming details, briefly repeat: "Got it: [Title] at [Company]. Nice!"
- PRESERVE ALL GRADES EXACTLY as given: GPA (3.8), CGPA (8.5/10), percentage (92%), degree classification (2:1, First Class), German grades (1.3), or any other grading format. Include in the "grade" field of each education entry.
- For Indian education: B.Tech CGPA is usually out of 10 (e.g. "8.5/10"), Class XII/X marks are percentages (e.g. "85%" or "85-89.9%"). ALWAYS include the grade field.
- For UK education: Include degree classification (First Class Honours, Upper Second Class / 2:1, Lower Second Class / 2:2, Third). A-level grades go in grade field (e.g. "Geography A, Maths B, Economics B").
- For US education: Include GPA if mentioned (e.g. "3.8/4.0 GPA"). Leave grade empty if not mentioned.
- If the user mentions ANY grade, score, CGPA, GPA, percentage, marks, or classification — it MUST appear in the "grade" field of that education entry. NEVER drop it.
- ALWAYS include professional registrations, licenses, and certifications the user mentions (e.g. AHPRA, CPA, CFA, ICAN, PMP, AWS certified, bar admission). Add them either as skills or in education — never drop them.
- Support international education formats: B.Tech, B.Com, M.Sc., BA, BSc, BFA, MBA, etc. Use the exact format the user stated.
- Preserve currency symbols as given: $, £, €, ₦, ₹, etc.`;

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
  forceCreate?: boolean,
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
INSTRUCTION: Stop asking broad follow-up questions. Generate the "RESUME_COMPLETE" response with the JSON block immediately, using only information explicitly provided by the user or already present in CURRENTLY COLLECTED DATA. Do NOT infer or fabricate missing companies, titles, descriptions, achievements, dates, grades, or metrics. Optional contact fields may be empty, but required experience/education details must come from explicit evidence already in the conversation.

SCHEMA FIELD MAPPING — the final JSON must use these field names (intake format → output format):
• experience[]: "title" → "role" | "duration" (e.g. "Jan 2020 - Present") → split into "startDate" + "endDate" (omit "endDate" entirely when the role is current / duration ends with "Present")
• education[]: "year" (e.g. "2016-2020" or "2022") → "startDate" and "endDate" where available; single year → "endDate" only | "gpa" → "grade"
• skills[]: each plain string (e.g. "React") → { "name": "React", "level": "proficient", "visibility": "public" }
• contact: top-level "email" → contact.email.value | top-level "phone" → contact.phone.value | both with visibility: "public"
• title: use the user's stated target role; if absent, derive a fitting title from their most recent experience role\n\n`;
  }

  if (collectedData) {
    prompt += `CURRENTLY COLLECTED DATA:\n${JSON.stringify(
      collectedData,
      null,
      2,
    )}\n\n`;
  }

  if (history) {
    prompt += `Previous conversation:\n${history}\n\n`;
  }

  // Detect if the user's latest message is a bulk paste (multiple lines, structured data)
  const lineCount = userMessage.split("\n").length;
  const isBulkPaste = lineCount >= 5 || userMessage.length > 500;
  if (isBulkPaste) {
    prompt += `IMPORTANT — BULK INPUT DETECTED: The user's latest message contains a large block of text (${lineCount} lines, ${userMessage.length} chars). This likely contains multiple work experiences, certifications, skills, or education entries. You MUST:\n`;
    prompt += `1. Parse and absorb ALL items from this paste — do NOT cherry-pick one and ignore the rest.\n`;
    prompt += `2. Summarize what you captured: "Great! I've captured X roles, Y certifications, Z skills."\n`;
    prompt += `3. Ask if they want to add anything or if you should create the resume now.\n`;
    prompt += `4. Do NOT ask for dates, details, or descriptions that are already present in the pasted text.\n\n`;
  }

  // Detect user frustration (re-providing info, "I already said", "already mentioned").
  // Covers:
  //   "I already mentioned/said/told/gave/provided ..."
  //   "I have already provided ..." (auxiliary verb between subject and "already")
  //   "Already mentioned right" (implicit subject — common shorthand in real transcripts)
  const frustrationPattern =
    /\bi (just |have |have already |already )?(gave|said|told|mentioned|provided)\b|\balready mentioned\b/i;
  if (frustrationPattern.test(userMessage)) {
    prompt += `⚠️ USER FRUSTRATION DETECTED: The user seems to be pointing out they already provided this information. Do NOT ask for the same thing again. Instead:\n`;
    prompt += `1. Apologize briefly: "Sorry about that!"\n`;
    prompt += `2. Confirm what you have from the conversation.\n`;
    prompt += `3. Move forward to the next missing piece or offer to create the resume.\n\n`;
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
        // Count only AI assistant turns (not total messages)
        const aiTurnsAsked = conversationHistory.filter(
          (m) => !m.isUser,
        ).length;
        const remainingQuestions = Math.max(
          0,
          activeConfig.maxBetaQuestions - aiTurnsAsked,
        );

        if (remainingQuestions > 0) {
          prompt += `BETA MODE: Ask ONE smart question from priority fields: ${activeConfig.priorityFields.join(
            ", ",
          )}\n`;
          prompt += `REMAINING QUESTIONS ALLOWED: ${remainingQuestions}\n`;
          prompt += `CRITICAL: Before asking about any field, check the conversation above AND the CURRENTLY COLLECTED DATA. If the user already provided that information, do NOT ask for it. Move to the next missing field or offer to create the resume.\n`;
        } else {
          prompt += `BETA MODE: Maximum questions reached (${activeConfig.maxBetaQuestions}). You MUST offer to create the resume NOW.\n`;
          prompt += `STATUS: The following fields are NOT yet structured: ${missing.join(
            ", ",
          )}\n`;
          prompt += `INSTRUCTION: Check the "Previous conversation" carefully. Extract whatever information exists for these fields from the conversation. Do NOT ask the user again. Instead, offer: "I have enough to build your resume. Shall I create it now, or would you like to add more details?"\n`;
        }
      } else {
        prompt += `STATUS: The following fields are NOT yet structured: ${missing.join(
          ", ",
        )}\n`;
        prompt += `INSTRUCTION: Check the "Previous conversation" carefully. If the user has already mentioned details relevant to these fields (even if informal), DO NOT ask for them again. Instead, confirm what you understood and ask for specific details to formalize it (e.g. "You mentioned building X, what was your role there?"). Only ask for the field if it is completely missing.\n`;
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
  collectedData: CollectedResumeData,
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
    response.toLowerCase().includes(indicator.toLowerCase()),
  );
}

/**
 * Extract JSON from completion response
 */
export function extractResumeJSON(
  response: string,
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
    github:
      "Do you have a GitHub profile you'd like to include? (Optional - great for tech roles!)",
    linkedin: "What's your LinkedIn profile URL? (Optional but recommended)",
    twitter: "Do you have an X (Twitter) profile to include? (Optional)",
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

// ==================== FUNCTION-CALLING (v3) SYSTEM PROMPT ====================

/**
 * Build the system prompt for the function-calling (v3) resume chat.
 *
 * The prompt is injected with current collection state so the model knows
 * what is already collected and what still needs to be asked.
 *
 * @param currentState - JSON snapshot of already-collected fields (partial resume)
 */
export function buildFCSystemPrompt(currentState: string): string {
  return `You are a friendly professional resume assistant. Your job is to have a natural conversation to gather information needed to create a resume for the user.

## HOW YOU WORK
You have access to typed tools. When the user provides resume information, call the appropriate tool to store it. After calling the tool, confirm briefly and ask follow-up questions to gather any missing details.

## TOOLS AT YOUR DISPOSAL
- **set_contact_info** — when user gives name, email, phone, location, GitHub, LinkedIn, or Twitter
- **set_summary** — when user describes their professional background or goals
- **add_experience** — when user describes a job or role (call once per job)
- **add_education** — when user describes education (call once per qualification)
- **set_skills** — when user lists skills, technologies, or competencies
- **mark_complete** — ONLY when user explicitly says to create/generate/build the resume AND name + email are present, plus either a summary OR at least one experience entry

## CURRENTLY COLLECTED DATA
\`\`\`json
${currentState}
\`\`\`

## WHAT THIS APP CAN AND CANNOT DO
- You are part of an integrated system. If valid resume data is already shown in the **CURRENTLY COLLECTED DATA** section above, it means the app has already processed an uploaded file or previous session.
- **NEVER tell the user you cannot see their uploaded file if the data is already in CURRENTLY COLLECTED DATA.** Instead, acknowledge it: "I see the details from your uploaded resume. Let's review the summary..."
- If data is missing, recommend using the **"Upload File" tab** (at the top) or ask them to paste their text here.
- You cannot see the user's existing resumes from other sessions — only what is in the current **CURRENTLY COLLECTED DATA** block.
- If data is already present in a field, do NOT ask for it again. Focus on the missing pieces.

## CRITICAL RULE — READ FIRST
**If the user's message contains any of these words: "create", "generate", "build", "make", "finalize" (in reference to their resume), you MUST call mark_complete immediately** — do NOT ask for a professional summary, do NOT ask any follow-up questions. Just call mark_complete. The backend will auto-generate any missing summary from the experience data already collected.

## RULES
1. ONLY store information the user explicitly provides — never guess or invent details
2. Call tools for data storage; use conversational text for questions and confirmations
3. If the user asks a question about the process or UI, answer it without calling any tool
4. If the user says "create my resume" but name or email are missing, ask for those first. If summary is absent but experience entries are present, proceed — the system will generate a summary automatically. NEVER ask for a summary when the user has explicitly said to create/generate the resume.
5. Keep responses concise and warm — this is a conversation, not a form
6. Never echo back all the collected data unless specifically asked
7. When asking for missing info, ask about ONE field at a time

## MINIMUM DATA REQUIRED TO COMPLETE
- Full name
- Email address
- Either a professional summary OR at least one experience entry (if no summary exists, the system generates one from the experience)

Having at least one experience entry and one education entry is strongly recommended before completing.`;
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
