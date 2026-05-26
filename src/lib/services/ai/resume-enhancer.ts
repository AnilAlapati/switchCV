import { logger } from "@/lib/logger";

import { z } from "zod";

export const GenerateResumeSchema = z.object({
  resumeData: z.object({
    personalInfo: z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      phone: z.string().optional(),
      location: z.string().optional(),
    }),
    summary: z.string().default(""),
    skills: z.array(z.string()).default([]),
    experience: z
      .array(
        z.object({
          title: z.string().min(1, "Job title is required"),
          company: z.string().min(1, "Company is required"),
          duration: z.string().min(1, "Duration is required"),
          description: z.string().min(1, "Description is required"),
        }),
      )
      .default([]),
    education: z
      .array(
        z.object({
          degree: z.string().min(1, "Degree is required"),
          institution: z.string().min(1, "Institution is required"),
          year: z.string().min(1, "Year is required"),
        }),
      )
      .default([]),
  }),
  tone: z
    .enum(["professional", "creative", "concise"])
    .optional()
    .default("professional"),
  mode: z.enum(["standard", "autonomous"]).optional().default("standard"),
  feedback: z.string().max(1000).optional(),
});

export type GenerateResumeRequest = z.infer<typeof GenerateResumeSchema>;

/**
 * Create a detailed prompt for resume enhancement
 */
export function createResumeEnhancementPrompt(
  resumeData: GenerateResumeRequest["resumeData"],
  tone: string,
  feedback?: string,
): string {
  const {
    personalInfo,
    summary = "",
    skills = [],
    experience = [],
    education = [],
  } = resumeData;

  const experienceText =
    (experience || [])
      .map(
        (exp) =>
          `${exp.title} at ${exp.company} (${exp.duration}): ${exp.description}`,
      )
      .join("\n") || "No experience provided";

  const feedbackInstruction = feedback
    ? `\n\nFEEDBACK: ${feedback}\nPlease revise the enhanced content to address this feedback while preserving strong action verbs and concise language.`
    : "";

  return `You are an expert resume writer and career coach. Enhance the following resume content with professional language and impactful descriptions.

RESUME CONTENT:
Name: ${personalInfo.name}
Email: ${personalInfo.email}
Current Summary: ${summary || "Professional seeking opportunities"}

EXPERIENCE:
${experienceText}

SKILLS: ${(skills || []).join(", ") || "Skills not provided"}

EDUCATION:
${
  (education || [])
    .map(
      (edu) =>
        `${edu.degree} from ${edu.institution} (${edu.year})${
          (edu as { gpa?: string }).gpa
            ? ` — Grade: ${(edu as { gpa?: string }).gpa}`
            : ""
        }`,
    )
    .join("\n") || "No education provided"
}

TONE: ${tone}${feedbackInstruction}

Please provide enhancements in the following JSON format (IMPORTANT - respond ONLY with valid JSON):
{
  "enhancedSummary": "A compelling 2-3 sentence professional summary highlighting key strengths",
  "enhancedExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Duration",
      "description": "Original description",
      "enhancedDescription": "Enhanced description with impact and metrics",
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "skillSuggestions": ["Additional relevant skill 1", "Additional relevant skill 2", "Additional relevant skill 3"],
  "improvementTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Ensure all descriptions use strong action verbs, quantify achievements with metrics, and maintain the ${tone} tone throughout.`;
}

/**
 * Parse AI response and extract structured data
 */
export function parseAIResponse(
  aiText: string,
  resumeData: GenerateResumeRequest["resumeData"],
): Record<string, unknown> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("⚠️ Could not find JSON in AI response, using defaults");
      return generateFallbackEnhancement(resumeData);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      enhancedSummary:
        parsed.enhancedSummary ||
        `Professional ${
          resumeData.personalInfo.name
        } with expertise in ${resumeData.skills.slice(0, 2).join(" and ")}.`,
      enhancedExperience: (
        parsed.enhancedExperience || resumeData.experience
      ).map((exp: Record<string, unknown>) => ({
        title: exp.title,
        company: exp.company,
        duration: exp.duration,
        description: exp.description,
        enhancedDescription:
          exp.enhancedDescription ||
          `${exp.description} Achieved measurable results through strategic initiatives and collaborative leadership.`,
        achievements: exp.achievements || [
          "Delivered key projects on time",
          "Improved team efficiency",
          "Contributed to company success",
        ],
      })),
      skillSuggestions: parsed.skillSuggestions || [
        "Project Management",
        "Strategic Planning",
        "Data Analysis",
        "Software Engineering",
        "Cloud Architecture",
      ],
      improvementTips: parsed.improvementTips || [
        "Add quantifiable metrics to achievements",
        "Use strong action verbs",
        "Highlight leadership and impact",
        "Quantify your accomplishments where possible",
      ],
    };
  } catch (error) {
    logger.error({ err: error }, "❌ Error parsing AI response:");
    return generateFallbackEnhancement(resumeData);
  }
}

/**
 * Generate fallback enhancement if AI fails
 */
export function generateFallbackEnhancement(
  resumeData: GenerateResumeRequest["resumeData"],
): Record<string, unknown> {
  return {
    enhancedSummary: `Results-driven professional with ${
      resumeData.experience.length
    }+ years of experience in ${
      resumeData.skills[0] || "leadership"
    }. Proven track record of delivering high-impact solutions and driving organizational success.`,
    enhancedExperience: resumeData.experience.map((exp) => ({
      title: exp.title,
      company: exp.company,
      duration: exp.duration,
      description: exp.description,
      enhancedDescription: `${exp.description} Consistently delivered measurable results through strategic planning, cross-functional collaboration, and innovative problem-solving approaches.`,
      achievements: [
        `Improved operational efficiency in ${exp.title} role`,
        "Successfully managed key initiatives",
        "Contributed to team success and organizational goals",
      ],
    })),
    skillSuggestions: [
      "Project Management",
      "Strategic Planning",
      "Team Leadership",
      "Data Analysis",
      "Process Optimization",
    ],
    improvementTips: [
      "Add specific metrics and percentages to achievements",
      "Use powerful action verbs at the start of descriptions",
      "Quantify impact with measurable results",
      "Highlight technical skills relevant to target role",
    ],
  };
}
