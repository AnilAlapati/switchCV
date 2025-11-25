// src/lib/utils/aiPrompts.ts
import { ResumeData, ConversationStage } from "@/hooks/useResumeDataCollection";

const GREETING_PROMPT = `You are a professional AI Resume Assistant. Generate a warm, engaging, single-paragraph greeting that:
- Introduces yourself as an AI Resume Assistant
- Explains you'll help create a perfect resume
- Asks what job role or industry they're targeting
- Gives 2-3 examples like 'Software Engineer at a tech startup', 'Marketing Manager', 'Data Scientist'
Keep it friendly and conversational, under 3 sentences.

Greeting:`;

const EXPERIENCE_PROMPT_TEMPLATE = (
  jobTarget: string
) => `You are a professional resume coach. The user wants a job as: "${jobTarget}".
          
Generate ONE specific, engaging question to ask about their work experience that's relevant to their target role. The question should:
- Be conversational and friendly
- Ask about relevant experience for their specific job target
- Encourage detailed responses about achievements
- Be a single sentence

Question:`;

const SKILLS_PROMPT_TEMPLATE = (jobTarget: string, experience: string) =>
  `You are a professional resume coach. The user wants a job as: "${jobTarget}" and has experience: "${experience}".
          
Generate ONE specific question to ask about their technical/professional skills that's relevant to their target role. The question should:
- Be conversational and friendly
- Focus on skills relevant to their job target
- Consider their experience background
- Be a single sentence

Question:`;

const EDUCATION_PROMPT_TEMPLATE = (jobTarget: string) =>
  `You are a professional resume coach. The user wants a job as: "${jobTarget}".
          
Generate ONE specific question about their educational background relevant to their target role. The question should:
- Be conversational and friendly
- Ask about relevant degrees, certifications, or training
- Be a single sentence

Question:`;

const PERSONAL_PROMPT = `You are a professional resume coach. Generate a friendly, single-sentence question asking for their contact information (full name, email, and location). Keep it simple and professional.

Question:`;

export const getPromptForStage = (
  stage: ConversationStage,
  data: ResumeData
): string => {
  switch (stage) {
    case "initial":
      return GREETING_PROMPT;
    case "experience":
      return EXPERIENCE_PROMPT_TEMPLATE(data.jobTarget || "");
    case "skills":
      return SKILLS_PROMPT_TEMPLATE(
        data.jobTarget || "",
        data.experience || ""
      );
    case "education":
      return EDUCATION_PROMPT_TEMPLATE(data.jobTarget || "");
    case "personal":
      return PERSONAL_PROMPT;
    default:
      return "Tell me more about that.";
  }
};

export const FALLBACK_RESPONSES: Record<string, string> = {
  experience:
    "Great! Now tell me about your work experience. What's your most recent role and what did you accomplish there?",
  skills:
    "Excellent! What are your key skills and technologies? List them out.",
  education:
    "Perfect! What's your educational background? (e.g., 'Bachelor's in Computer Science from MIT, 2018')",
  personal:
    "Almost done! What's your full name, email, and location? (e.g., 'John Smith, john@email.com, San Francisco, CA')",
};
