import { ResumeDataRequirements } from "../conversationManager";
import { IExtractor } from "./IExtractor";

/**
 * SummaryExtractor
 *
 * Deterministic fallback for extracting professional summaries when AI extraction is unavailable.
 * Detects patterns like "Summary:", "Objective:", etc., and captures the following paragraph.
 */
export class SummaryExtractor implements IExtractor {
  private static readonly SUMMARY_MARKERS = [
    /^(?:professional\s+)?summary[:\s]*/i,
    /^(?:career\s+)?objective[:\s]*/i,
    /^profile[:\s]*/i,
    /^about(?:\s+me)?[:\s]*/i,
    /^(?:executive\s+)?summary[:\s]*/i,
  ];

  extract(text: string): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const lines = text.split("\n").map((l) => l.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      for (const marker of SummaryExtractor.SUMMARY_MARKERS) {
        if (marker.test(line)) {
          // If the marker itself contains the content (e.g., "Summary: Experienced engineer...")
          const inlineContent = line.replace(marker, "").trim();
          if (inlineContent.length > 20) {
            data.summary = inlineContent;
            return data;
          }

          // Otherwise, look at the next few lines for the content
          let paragraph = "";
          let j = i + 1;
          while (j < lines.length && j < i + 5) {
            const nextLine = lines[j]?.trim();
            if (!nextLine) {
              j++;
              continue;
            }

            // If we hit another header-looking line, stop
            if (this.isLikelyHeader(nextLine)) break;

            paragraph += (paragraph ? " " : "") + nextLine;
            j++;
          }

          if (paragraph.trim().length > 20) {
            data.summary = paragraph.trim();
            return data;
          }
        }
      }
    }

    return data;
  }

  private isLikelyHeader(line: string): boolean {
    // Section headers are usually short and uppercase or end with a colon
    if (line.length > 50) return false;
    if (line.endsWith(":")) return true;
    if (line === line.toUpperCase() && line.length > 3) return true;

    const COMMON_HEADERS = [
      "experience",
      "work",
      "education",
      "skills",
      "projects",
      "contact",
      "personal",
      "hobbies",
      "languages",
      "certifications",
      "interests",
    ];

    return COMMON_HEADERS.some((h) => line.toLowerCase().includes(h));
  }
}
