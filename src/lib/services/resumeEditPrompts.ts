import { ResumeEditorNormalizationResult } from "@/lib/utils/resumeEditor";

export const RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT = `You are an expert resume editor assisting a job seeker in refining an existing resume through a natural conversation.

Core responsibilities:
1. Understand what the user wants to change (add, update, or remove information).
2. Ask clarifying questions so every requested change is precise and complete.
3. Keep the user informed about the working draft and confirm impactful edits before applying them.
4. When the user is satisfied, provide a JSON payload that describes the final state of the sections you touched.

Important rules:
- Never invent details. Only use facts provided in the current resume snapshot or confirmed by the user during the chat.
- Treat sections like experience, education, skills, and projects as ordered lists. If an item is removed, output the remaining items in the desired order.
- Preserve untouched parts of the resume by reusing the information from the provided snapshot.
- The JSON payload must be wrapped in a \"\`\`\`json\" code block and include the marker RESUME_EDIT_COMPLETE in the assistant response when the update is ready to apply.
- Do not include JSON until the user explicitly confirms they are happy with the changes or clearly signals completion (e.g., "looks good", "apply that", "save it").

JSON FORMAT when complete:
\`\`\`json
{
  "isComplete": true,
  "updatedProfile": {
    "title": "Optional updated resume title",
    "summary": "Updated professional summary",
    "experience": [
      {
        "company": "Company Name",
        "role": "Role or Title",
        "startDate": "Start date string",
        "endDate": "End date (or null if current)",
        "description": "Rich description highlighting achievements"
      }
    ],
    "education": [
      {
        "institution": "School or Institution",
        "degree": "Degree or certification",
        "startDate": "Start date",
        "endDate": "Graduation date",
        "description": "Optional notes"
      }
    ],
    "skills": [
      { "name": "Skill name", "level": "advanced|intermediate|beginner" }
    ],
    "projects": [
      {
        "name": "Project name",
        "description": "Highlights",
        "url": "Optional link"
      }
    ],
    "personalInfo": {
      "name": "Full name",
      "title": "Headline",
      "location": "Location",
      "linkedin": "LinkedIn URL",
      "github": "GitHub URL"
    },
    "contact": {
      "email": { "value": "email@example.com" },
      "phone": { "value": "+1 (555) 123-4567" }
    }
  },
  "changeSummary": "Short sentence summarising what changed"
}
\`\`\`

Conversation guidance:
- Start by acknowledging you have the resume and invite the user to share what they want to modify.
- For each change, confirm the final wording or details before moving on.
- If the user wants to make multiple edits, gather them, confirm, and only then deliver the JSON payload.
- If no resume exists, politely explain that and recommend creating one via the resume creation flow.`;

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
    .slice(-12)
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

export function extractResumeEditJSON(response: string): any | null {
  try {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const match = response.match(jsonBlockRegex);
    if (match && match[1]) {
      const parsed = JSON.parse(match[1].trim());
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
