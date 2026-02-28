import {
  ResumeDataRequirements,
  ExperienceEntry,
} from "../conversationManager";
import { IExtractor } from "./IExtractor";

export class ExperienceExtractor implements IExtractor {
  extract(
    text: string,
    context?: "education" | "experience" | "skills" | "contact" | null
  ): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const fullText = text;

    // Basic detection
    const experienceKeywords = [
      "worked at",
      "work at",
      "employed at",
      "position at",
      "job at",
      "role at",
      "worked as",
      "work as",
      "current role",
      "currently working",
      "i'm a",
      "i am a",
      "working as",
      "senior software engineer",
      "software engineer",
      "developer",
      "engineer",
      "manager",
    ];

    // Check if this is experience context
    const isExperienceContext = context === "experience";

    // Check if we should even run this (optimization)
    const hasExperience =
      isExperienceContext ||
      experienceKeywords.some((kw) => fullText.toLowerCase().includes(kw));

    // Section detection
    const experienceSectionRegex =
      /(?:Professional Experience|Work History|Experience|Employment History)(?::|)\s*([\s\S]+?)(?=(?:\n\s*(?:Education|Skills|Projects|Reference)|$))/i;
    const sectionMatch = fullText.match(experienceSectionRegex);
    const textToSearch = sectionMatch ? sectionMatch[1] : fullText;

    if (
      hasExperience ||
      /@/.test(textToSearch) ||
      sectionMatch ||
      isExperienceContext
    ) {
      const expPatterns = [
        // Bullet: "- Title at Company"
        /(?:^|\n)\s*[-•]\s*([A-Za-z0-9\s]+?)\s+(?:at|\||@)\s+([A-Za-z0-9\s]+)(?=\n|$)/,
        // Standard "Title at Company"
        /(?:worked|work|employed|position|job|role)\s+(?:as|at)\s+((?:(?! at ).)+)(?:\s+at\s+([^,.\n]+))?/i,
        // "Title @ Company"
        /([A-Za-z\s]+)\s+@\s+([A-Za-z\s]+)/,
        // Block format
        /(?:^|\n)(?!Professional Experience|Work History|Experience)([A-Z][a-zA-Z0-9\s]+?)\s*\n\s*(?:at\s+)?([A-Z][a-zA-Z0-9\s]+?)(?=\s*\n|\s+\d{4})/,
        // Single line fallback
        /(?:^|\n)([A-Za-z0-9\s]+?)\s+(?:at|@)\s+([A-Za-z0-9\s]+?)(?=\s*\n|$)/,
      ];

      for (const pattern of expPatterns) {
        const expMatch = textToSearch.match(pattern);
        if (expMatch) {
          const title = expMatch[1]?.trim() || "";
          const company = expMatch[2]?.trim() || "";

          if (!title || !company) {
            continue;
          }

          const experience: ExperienceEntry = {
            title,
            company,
            duration: "",
            description: "",
          };

          data.experience = [experience];
          break;
        }
      }
    }

    return data;
  }
}
