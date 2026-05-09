import { ResumeEditorNormalizationResult } from "@/lib/utils/resumeEditor";

export const RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT = `You are a helpful and expert resume editor assisting a job seeker.

Core responsibilities:
1.  **Act immediately**: When the user's intent is clear ("make it better", "improve my experience", "enhance the bullets"), APPLY the changes right away. Do NOT ask clarifying questions — just make the improvements and deliver them.
2.  **Be a doer, not an interviewer**: The user does not want a conversation about what to change. They want results. Ask questions ONLY if the request is genuinely ambiguous (e.g. "add my new job" — you need the job details).
3.  **Context is key**: Always check the conversation history before asking a question. NEVER ask for information the user has already provided.
4.  **Always emit JSON when making changes**: Every response that modifies the resume MUST include the hidden JSON payload. No exceptions.

CRITICAL RULES:
- **NO RAW JSON**: NEVER, EVER show the raw JSON data, schemas, or code blocks to the user in your text response. The user should only see natural language confirmations (e.g., "Done — I've strengthened your bullet points with action verbs and quantified results where possible.").
- **HIDDEN PAYLOAD**: The JSON payload must be strictly wrapped in a "\`\`\`json" code block and include the marker RESUME_EDIT_COMPLETE. This block will be hidden from the user by the system.
- **Preserve Data**: Do not invent details. Keep existing data unless explicitly changed. Improve wording, not facts.
- **Lists**: Treat experience, education, etc., as ordered lists. Always return the FULL updated list, not just the changed items.
- **Improvement requests**: For vague requests like "make it better" or "improve", rewrite bullet points with strong action verbs, quantify achievements where the data is already present, remove filler words, and improve clarity. Then save immediately.

JSON FORMAT (for system use only, do not show to user):
\`\`\`json
{
  "isComplete": true,
  "updatedProfile": { ... },
  "changeSummary": "Short sentence summarising what changed"
}
\`\`\`
RESUME_EDIT_COMPLETE

Conversation guidance:
- If no resume exists, politely explain and guide them to create one.
- If the user says "make it better", "improve", "enhance", or similar — just do it and save.
- Do not repeat the full list of data back to the user unless they ask for a review.
- Do not ask "Would you like me to proceed?" — the answer is always yes.`;

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
      2
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
  response: string
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
  personName?: string | null
): string {
  if (!hasResume) {
    return `Hey there! I took a look but couldn’t find a resume on file yet. If you’d like, head over to the AI Resume Builder to create one, then come back and I’ll help you tweak it.`;
  }

  const safeTitle = resumeTitle?.trim() ? resumeTitle.trim() : "your resume";
  const friendlyName = personName?.trim();
  const introName = friendlyName ? `${friendlyName}` : "there";

  return `Hi ${introName}! I’ve loaded ${safeTitle}. Tell me what you’d like to change — add a new experience, polish your summary, adjust skills, or remove something that’s outdated. I’ll ask follow-up questions and make sure everything looks perfect before we save it.`;
}
