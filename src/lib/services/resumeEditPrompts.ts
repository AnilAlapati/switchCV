import { ResumeEditorNormalizationResult } from "@/lib/utils/resumeEditor";

export const RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT = `You are a world-class resume editor and career coach. Your job is to make resumes outstanding — not to ask questions.

## GOLDEN RULE: ACT, DON'T ASK
When the user's intent is clear, apply improvements immediately and save them. NEVER ask "Would you like me to proceed?", "Shall I go ahead?", or any confirmation question. The answer is always yes. Only ask a question when you literally cannot proceed without missing information (e.g. "add my new job at Google" — you need dates and description).

## HOW TO IMPROVE EACH SECTION

**Experience bullets — always apply ALL of these:**
- Start every bullet with a strong past-tense action verb (Led, Built, Reduced, Launched, Scaled, Optimised, Delivered, Designed, Drove, Implemented, Automated, Increased, Managed, Spearheaded, Transformed)
- Quantify where numbers already exist in the text (e.g. "improved performance" → "improved API response time by 40%"). Do NOT invent numbers.
- Remove weak openers: "Responsible for", "Worked on", "Helped with", "Assisted in", "Was involved in"
- Remove filler: "various", "multiple", "etc.", "and more"
- Each bullet should answer: What did you do? What was the result/impact?
- Aim for 2–4 tight bullets per role, not a wall of text

**Skills section — always apply ALL of these:**
- Group skills into logical categories (e.g. Languages, Frameworks, Cloud, Tools, Methodologies)
- Remove duplicates and near-duplicates
- Order categories by relevance to the user's most recent/senior role
- Use consistent naming conventions (React not ReactJS, TypeScript not Typescript)

**Projects section — always apply ALL of these:**
- Lead each description with the problem solved or the outcome, not just what it is
- Include tech stack if already present
- Tighten to 1–2 sentences max per project
- Remove vague phrases like "a web app that...", "a tool for..." — get straight to the value

**Summary section:**
- 2–3 sentences max
- Lead with seniority level and domain (e.g. "Senior backend engineer with 8 years...")
- Include top 2–3 most relevant skills
- End with what kind of role/impact they're targeting

## CRITICAL RULES
- **NO RAW JSON IN CHAT**: Never show JSON, code blocks, or schemas in your text response. Speak naturally (e.g. "Done — I've sharpened your bullet points and grouped your skills by category.")
- **ALWAYS EMIT PAYLOAD**: Every response that modifies anything MUST include the hidden JSON block below. No exceptions. Not emitting it means changes are lost.
- **PRESERVE FACTS**: Improve wording only. Do not add, change, or invent job titles, company names, dates, technologies, or any factual detail.
- **RETURN COMPLETE LISTS**: Always return the full updated list for any section you touch. Never return only the changed items.

## JSON PAYLOAD FORMAT (hidden from user — system use only)
\`\`\`json
{
  "isComplete": true,
  "updatedProfile": { ... full updated resume fields ... },
  "changeSummary": "One sentence describing what changed"
}
\`\`\`
RESUME_EDIT_COMPLETE

## CONVERSATION RULES
- If no resume exists: explain and direct them to the resume builder.
- "Make it better" / "improve" / "enhance" / "fix it" / "do not ask questions" = apply improvements immediately across all mentioned sections.
- After saving, tell the user briefly what you changed. Do not list every bullet — a 1–2 sentence summary is enough.
- Never repeat the full resume back to the user.`;

/**
 * Result of extracting resume edit JSON from AI response
 */
export interface ResumeEditResult {
  isComplete: boolean;
  updatedProfile?: {
    title?: string;
    summary?: string;
    experience?: Array<{
      company: string;
      role: string;
      startDate: string;
      endDate: string | null;
      description: string;
    }>;
    education?: Array<{
      institution: string;
      degree: string;
      startDate: string;
      endDate: string;
      description?: string;
    }>;
    skills?: Array<{
      name: string;
      level: "advanced" | "intermediate" | "beginner";
    }>;
    projects?: Array<{
      name: string;
      description: string;
      url?: string;
    }>;
    personalInfo?: {
      name: string;
      title?: string;
      location?: string;
      linkedin?: string;
      github?: string;
    };
    contact?: {
      email?: { value: string };
      phone?: { value: string };
    };
  };
  changeSummary?: string;
}

interface BuildResumeEditPromptArgs {
  userMessage: string;
  conversationHistory: Array<{ content: string; isUser: boolean }>;
  resumeSnapshot?: ResumeEditorNormalizationResult | null;
  pendingSummary?: string | null;
}

export function buildResumeEditPrompt({
  userMessage,
  conversationHistory,
  resumeSnapshot,
  pendingSummary,
}: BuildResumeEditPromptArgs): string {
  const history = conversationHistory
    .slice(-30)
    .map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  let prompt = `${RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT}\n\n`;

  if (resumeSnapshot) {
    const snapshotPayload = {
      title: resumeSnapshot.profile.title ?? resumeSnapshot.resume.title ?? "",
      summary:
        resumeSnapshot.profile.summary ?? resumeSnapshot.resume.summary ?? "",
      experience: resumeSnapshot.profile.experience ?? [],
      education: resumeSnapshot.profile.education ?? [],
      skills: resumeSnapshot.profile.skills ?? [],
      projects: resumeSnapshot.profile.projects ?? [],
      personalInfo: resumeSnapshot.profile.personalInfo ?? {},
      contact: resumeSnapshot.profile.contact ?? {},
    };

    prompt += `CURRENT RESUME SNAPSHOT:\n${JSON.stringify(
      snapshotPayload,
      null,
      2,
    )}\n\n`;
  } else {
    prompt += `No resume exists for this user. You must politely guide them to create one instead of editing.\n\n`;
  }

  if (pendingSummary) {
    prompt += `RECENT CHANGE SUMMARY TO REMEMBER: ${pendingSummary}\n\n`;
  }

  if (history) {
    prompt += `Conversation so far:\n${history}\n\n`;
  }

  prompt += `Latest user message: "${userMessage}"\n\n`;
  prompt += `Compose your next assistant message. If the user's intent is clear, apply the changes now and include the hidden JSON payload with RESUME_EDIT_COMPLETE. Only ask a question if you genuinely cannot proceed without more information.`;

  return prompt;
}

export function extractResumeEditJSON(
  response: string,
): ResumeEditResult | null {
  try {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const match = response.match(jsonBlockRegex);
    if (match && match[1]) {
      const parsed = JSON.parse(match[1].trim()) as ResumeEditResult;
      if (parsed && parsed.isComplete) {
        return parsed;
      }
    }
  } catch {
    // Safe fallback when parsing fails
  }
  return null;
}

export function isResumeEditCompletion(response: string): boolean {
  // Primary: explicit marker in response text
  if (/RESUME_EDIT_COMPLETE/i.test(response)) return true;
  // Fallback: JSON block with isComplete:true (in case model omits the marker)
  try {
    const match = response.match(/```json\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      const parsed = JSON.parse(match[1].trim()) as { isComplete?: boolean };
      return parsed?.isComplete === true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function stripEditArtifacts(text: string): string {
  return text
    .replace(/RESUME_EDIT_COMPLETE/gi, "")
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getResumeEditGreeting(
  hasResume: boolean,
  resumeTitle?: string | null,
  personName?: string | null,
): string {
  if (!hasResume) {
    return `Hey there! I took a look but couldn’t find a resume on file yet. If you’d like, head over to the AI Resume Builder to create one, then come back and I’ll help you tweak it.`;
  }

  const safeTitle = resumeTitle?.trim() ? resumeTitle.trim() : "your resume";
  const friendlyName = personName?.trim();
  const introName = friendlyName ? `${friendlyName}` : "there";

  return `Hi ${introName}! I’ve loaded ${safeTitle}. Tell me what you’d like to change — add a new experience, polish your summary, adjust skills, or remove something that’s outdated. I’ll ask follow-up questions and make sure everything looks perfect before we save it.`;
}
