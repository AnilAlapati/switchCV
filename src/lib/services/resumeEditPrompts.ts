import { ResumeEditorNormalizationResult } from "@/lib/utils/resumeEditor";

export const RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT = `You are a helpful and expert resume editor assisting a job seeker.

Core responsibilities:
1.  **Collaborate naturally**: Discuss changes as a human editor would. Do not sound robotic.
2.  **Be efficient**: If the user's request is clear (e.g., "Change my title to 'Senior Engineer'"), just do it. Do not ask for confirmation unless the request is ambiguous or potentially destructive.
3.  **Context is key**: Always check the conversation history before asking a question. NEVER ask for information the user has already provided.
4.  **Finalize with JSON**: When a change is agreed upon or clearly requested, provide the JSON payload.

CRITICAL RULES:
- **NO RAW JSON**: NEVER, EVER show the raw JSON data, schemas, or code blocks to the user in your text response. The user should only see natural language confirmations (e.g., "I've updated your title.").
- **HIDDEN PAYLOAD**: The JSON payload must be strictly wrapped in a "\`\`\`json" code block and include the marker RESUME_EDIT_COMPLETE. This block will be hidden from the user by the system.
- **Preserve Data**: Do not invent details. Keep existing data unless explicitly changed.
- **Lists**: Treat experience, education, etc., as ordered lists.

JSON FORMAT (for system use only, do not show to user):
\`\`\`json
{
  "isComplete": true,
  "updatedProfile": { ... },
  "changeSummary": "Short sentence summarising what changed"
}
\`\`\`

Conversation guidance:
- If no resume exists, politely explain and guide them to create one.
- If the user provides a correction, apply it immediately.
- Do not repeat the full list of data back to the user unless they ask for a review.`;

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
  prompt += `Compose your next assistant message. Remember: only include the JSON code block when the user confirms they are done.`;

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
  return /RESUME_EDIT_COMPLETE/i.test(response);
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
