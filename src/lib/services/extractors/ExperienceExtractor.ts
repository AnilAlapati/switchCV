import {
  ResumeDataRequirements,
  ExperienceEntry,
} from "../conversationManager";
import { IExtractor } from "./IExtractor";

export class ExperienceExtractor implements IExtractor {
  extract(
    text: string,
    context?: "education" | "experience" | "skills" | "contact" | null,
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
        // "Title, Company — Location (dates)" — em/en dash separator (after normalization becomes -)
        /(?:^|\n)([A-Z][a-zA-Z\s]+?),\s+([A-Z][a-zA-Z0-9\s]+?)\s+(?:—|–|-)\s/m,
        // "Title, Company (dates)" — company followed directly by opening paren (no dash separator)
        /(?:^|\n)([A-Z][a-zA-Z\s]+?),\s+([A-Z][a-zA-Z0-9.]+(?:\s+[A-Z.][a-zA-Z0-9.]+)*)\s*\(/m,
        // "Title, Company, year" — comma separated with year
        /(?:^|\n)([A-Z][a-zA-Z\s]+?),\s+([A-Z][a-zA-Z0-9.]+(?:\s+[A-Z.][a-zA-Z0-9.]+)*)\s*,\s*\d{4}/m,
        // "Title • Company (dates)" — bullet between title and company
        /(?:^|\n)([A-Za-z][a-zA-Z\s]+?)\s+[•]\s+([A-Za-z][a-zA-Z0-9\s]+?)(?:\s+\(|\s+\d{4})/m,
        // "Title | Company (dates)" — pipe separator
        /(?:^|\n)([A-Za-z][a-zA-Z\s]+?)\s+\|\s+([A-Za-z][a-zA-Z0-9\s]+?)(?:\s+\(|\s+\d{4}|–|—)/m,
        // "Title at Company (year)" — title followed by year in parens
        /(?:^|\n)([A-Za-z][a-zA-Z\s]+?)\s+at\s+([A-Za-z][a-zA-Z0-9\s]+?)\s*[(\d]{1}/m,
        // Chat format: "at a [startup|company] called CompanyName" — for informal chat messages
        /at\s+(?:a|an)\s+(?:\w+\s+)?(?:startup|company|firm|agency|organization|bank|client)\s+called\s+([A-Z][a-zA-Z0-9\s]+?)(?:\s+in\s+|\s+for\s+|\.|,|$)/i,
        // Chat format: "at Company for N months/years" — "at TechCo for 3 years"
        /at\s+([A-Z][a-zA-Z0-9\s]+?)\s+(?:for|over|about|–|since)/i,
        // Bullet: "- Title at Company"
        /(?:^|\n)\s*[-•]\s*([A-Za-z0-9\s]+?)\s+(?:at|\||@)\s+([A-Za-z0-9\s]+)(?=\n|$)/,
        // Standard keyword-based "worked/employed/position at Company"
        /(?:worked|work|employed|position|job|role)\s+(?:as|at)\s+((?:(?! at ).)+)(?:\s+at\s+([^,.\n]+))?/i,
        // "Title @ Company"
        /([A-Za-z\s]+)\s+@\s+([A-Za-z\s]+)/,
        // Block multiline: TITLE on first line, Company on next
        /(?:^|\n)(?!Professional Experience|Work History|Experience)([A-Z][a-zA-Z0-9\s]+?)\s*\n\s*(?:at\s+)?([A-Z][a-zA-Z0-9\s]+?)(?=\s*\n|\s+\d{4})/,
        // Single line fallback "Title at Company"
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
