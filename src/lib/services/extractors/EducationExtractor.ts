import { ResumeDataRequirements, EducationEntry } from "../conversationManager";
import { IExtractor } from "./IExtractor";

export class EducationExtractor implements IExtractor {
  extract(
    text: string,
    context?: "education" | "experience" | "skills" | "contact" | null,
  ): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const fullText = text;

    const educationKeywords = [
      "degree",
      "graduated",
      "studied at",
      "went to",
      "attending",
      "enrolled at",
      "university",
      "college",
      "bachelor",
      "master",
      "phd",
      "b.tech",
      "m.tech",
      "mba",
      "diploma",
      "education",
      "school",
      "institute",
      "academy",
      "major",
      "minor",
      "gpa",
      "transcript",
      "diploma",
      "certificate",
      "associate",
      "doctorate",
    ];

    const hasEducation =
      context === "education" ||
      educationKeywords.some((kw) => fullText.toLowerCase().includes(kw));

    if (hasEducation) {
      const eduPatterns = [
        // Pattern for "I have a [degree] from [institution]"
        /I have an?\s+(.+?)\s+from\s+(.+?)(?:\s+in\s+(\d{4}))?(?:\s|$|[.,])/i,
        // Comprehensive pattern
        /(B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?S|M\.?S|MBA|BBA|Diploma|B\.?A|M\.?A|Bachelor|Master|PhD|Doctorate)(?:\s+(?:in|of)\s+([^,]+?))?(?:[,]\s*|\s+from\s+|\s+at\s+)([^0-9,\n]+?)(?:\s+(?:in\s+)?(\d{4}))?(?:\s|$)/i,
        // Fallback patterns
        /(bachelor|master|phd|associate|doctorate|degree)(?:['\s]+(?:of|in))?\s+([^,.\n]+)?\s+(?:from|at)?\s*([^,.\n]+)/i,
        /graduated\s+from\s+(.+?)\s+(?:with|in)\s+(?:a\s+)?(.+)/i,
        /(bachelor|master|phd|associate|doctorate|degree)\s+([\w\s.&'-]+)/i,
      ];

      // Context-aware fallback patterns
      if (context === "education") {
        eduPatterns.push(
          /^(.+?)\s+(?:at|from|in)\s+(.+?)(?:\s+(\d{4}))?$/i,
          /^(.+?),\s*(.+?)(?:,\s*(\d{4}))?$/i,
        );
      }

      for (const pattern of eduPatterns) {
        const eduMatch = fullText.match(pattern);
        if (eduMatch) {
          let degree = "";
          let institution = "";
          let year = "";
          let major = "";

          // Simple parsing logic derived from original God Class
          if (pattern.source.includes("I have an?")) {
            degree = eduMatch[1].trim();
            institution = eduMatch[2].trim();
            if (eduMatch[3]) year = eduMatch[3];
          } else if (pattern.source.startsWith("(B\\.?Tech")) {
            degree = eduMatch[1].trim();
            major = eduMatch[2]?.trim() || "";
            institution = eduMatch[3]?.trim();
            if (eduMatch[4]) year = eduMatch[4];
          } else if (pattern.source.includes("graduated")) {
            institution = eduMatch[1].trim();
            degree = eduMatch[2].trim();
          } else if (
            context === "education" &&
            !pattern.source.includes("bachelor")
          ) {
            degree = eduMatch[1].trim();
            institution = eduMatch[2].trim();
            if (eduMatch[3]) year = eduMatch[3];
          } else {
            degree = eduMatch[1]
              ? `${eduMatch[1]} ${eduMatch[2] || ""}`.trim()
              : "";
            institution = eduMatch[3]?.trim() || eduMatch[2]?.trim() || "";
          }

          if (!degree || !institution) {
            continue;
          }

          const education: EducationEntry = {
            degree,
            institution,
            year,
            major: major || undefined,
            gpa: this.extractGrade(fullText) || undefined,
          };
          data.education = [education];
          break;
        }
      }
    }

    return data;
  }

  /**
   * Extract grade/GPA/CGPA/percentage/classification from text.
   * Supports India (CGPA out of 10, percentage), USA (GPA out of 4.0),
   * UK (degree classification like 2:1, First Class), and other formats.
   */
  private extractGrade(text: string): string | null {
    const gradePatterns = [
      // CGPA patterns (India): "CGPA 8.5/10", "CGPA 8.5 out of 10", "CGPA: 8.5"
      /CGPA\s*[:\-]?\s*(\d+\.?\d*\s*(?:\/\s*\d+|out\s+of\s+\d+)?)/i,
      // GPA patterns (USA): "GPA 3.8", "GPA 3.8/4.0", "GPA: 3.8"
      /GPA\s*[:\-]?\s*(\d+\.?\d*\s*(?:\/\s*\d+\.?\d*)?)/i,
      // Grade patterns: "Grade - 7.2/10", "Grade: 7.2"
      /Grade\s*[:\-]\s*(\d+\.?\d*\s*(?:\/\s*\d+)?)/i,
      // Marks patterns (India): "Marks - 85-89.9%", "Marks: 85%", "scored 85%"
      /(?:Marks|scored)\s*[:\-]?\s*(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?%)/i,
      // Percentage standalone: "with 85%", "85% marks"
      /(?:with\s+)?(\d{2,3}(?:\.\d+)?%)\s*(?:marks|aggregate)?/i,
      // UK degree classification
      /(?:with\s+(?:a\s+)?|,\s*)(First Class(?:\s+Honours)?|Upper Second Class|Lower Second Class|Third Class|[12]:[12]|2\.[12])/i,
      // German grade: "grade 1.3", "final grade 1.3"
      /(?:final\s+)?grade\s*[:\-]?\s*(\d\.\d)/i,
    ];

    for (const pattern of gradePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
