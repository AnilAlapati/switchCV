import {
  ResumeDataRequirements,
  ExperienceEntry,
} from "../conversationManager";
import { IExtractor } from "./IExtractor";

/**
 * Section headers that indicate non-experience content.
 * Lines under these headers are stripped before experience regex runs,
 * so skill rows or certifications cannot be misread as job titles.
 */
const NON_EXPERIENCE_SECTION_HEADERS =
  /^\s*(?:KEY SKILLS|SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|COMPETENCIES|CERTIFICATION|CERTIFICATIONS|LICENSES|PROJECTS|EDUCATION|SUMMARY|OBJECTIVE|PROFILE|ABOUT|CONTACT)\s*$/i;

/**
 * Known technology / skill keywords. If both the extracted "title" and
 * "company" consist entirely of these tokens the match is a false positive.
 */
const KNOWN_TECH_TOKENS = new Set([
  "api",
  "nextjs",
  "next.js",
  "uipath",
  "firebase",
  "react",
  "react.js",
  "angular",
  "vue",
  "node",
  "node.js",
  "python",
  "java",
  "sql",
  "nosql",
  "mongodb",
  "postgresql",
  "graphql",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "typescript",
  "javascript",
  "html",
  "css",
  "git",
  "linux",
  "bash",
  "redis",
  "elasticsearch",
  "tailwind",
  "bootstrap",
  "sass",
  "less",
  "flutter",
  "swift",
  "kotlin",
  "php",
  "ruby",
  "rails",
  "laravel",
  "django",
  "flask",
  "fastapi",
  "spring",
  ".net",
  "c#",
  "c++",
  "go",
  "rust",
  "svelte",
  "nuxt",
  "supabase",
  "microservices",
  "ci/cd",
  "agile",
  "scrum",
  "prompt",
  "engineering",
  "vibe",
  "coding",
  "prompt engineering",
  "vibe coding",
  "machine learning",
  "deep learning",
  "nlp",
  "llm",
  "genai",
  "gen ai",
]);

/**
 * Strip sections that are NOT work-experience from the text so regex
 * patterns do not accidentally match skill rows as experience entries.
 *
 * Algorithm: walk the text line by line; when a non-experience section header
 * is found, drop all subsequent lines until the next section header that IS
 * experience-related (or end-of-text).
 */
function stripNonExperienceSections(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (NON_EXPERIENCE_SECTION_HEADERS.test(line)) {
      skipping = true;
      continue;
    }
    // Resume keeping when we hit an experience-related header
    if (
      skipping &&
      /^\s*(?:Professional Experience|Work History|Experience|Employment History)\s*$/i.test(
        line,
      )
    ) {
      skipping = false;
    }
    if (!skipping) {
      kept.push(line);
    }
  }
  return kept.join("\n");
}

/**
 * Returns true when a candidate string looks like a list of tech skills
 * rather than a job title or company name.
 */
function looksLikeSkillsList(value: string): boolean {
  const tokens = value
    .toLowerCase()
    .split(/[\s,;|•·]+/)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  const techCount = tokens.filter((t) => KNOWN_TECH_TOKENS.has(t)).length;
  // If ≥ 60 % of tokens are known tech keywords, it's a skill list, not a title/company
  return techCount / tokens.length >= 0.6 && tokens.length >= 2;
}

export class ExperienceExtractor implements IExtractor {
  extract(
    text: string,
    context?: "education" | "experience" | "skills" | "contact" | null,
  ): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const fullText = text;

    // If context is explicitly skills, skip experience extraction entirely
    if (context === "skills") {
      return data;
    }

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
    // Strip non-experience sections (skills, certifications, etc.) to avoid
    // misreading skill rows as job titles / companies.
    const textToSearch = sectionMatch
      ? sectionMatch[1]
      : stripNonExperienceSections(fullText);

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

          // Guard: reject matches where title or company look like
          // lists of technology keywords (e.g. "API Nextjs UiPath Firebase"
          // + "Prompt Engineering Vibe coding" from a KEY SKILLS section).
          if (looksLikeSkillsList(title) || looksLikeSkillsList(company)) {
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
