import { ResumeDataRequirements } from "../conversationManager";
import { IExtractor } from "./IExtractor";

export class SkillsExtractor implements IExtractor {
  private static readonly TECH_KEYWORDS = [
    "Java",
    "Python",
    "React",
    "Node.js",
    "AWS",
    "Docker",
    "SQL",
    "NoSQL",
    "TypeScript",
    "Go",
    "Rust",
    "HTML",
    "CSS",
    "Git",
    "C++",
    "C#",
    "Kubernetes",
    "CI/CD",
    "Agile",
    "Scrum",
    "JavaScript",
    "Svelte",
    "Vue",
    "Nuxt",
    "Next.js",
    "Tailwind",
    "Bootstrap",
    "Sass",
    "Less",
    "GraphQL",
    "MongoDB",
    "PostgreSQL",
    "Firebase",
    "Supabase",
    "Flutter",
    "React Native",
    "Swift",
    "Kotlin",
    "PHP",
    "Ruby",
    "Rails",
    "Laravel",
    "Django",
    "Flask",
    "FastAPI",
    "Spring",
    ".NET",
    "Azure",
    "GCP",
    "Linux",
    "Bash",
    "Redis",
    "Elasticsearch",
  ];

  private static readonly STOPWORDS = new Set([
    "and",
    "or",
    "with",
    "the",
    "a",
    "an",
    "i",
    "know",
    "use",
    "experience",
    "experienced",
    "proficient",
    "skilled",
    "in",
  ]);

  extract(text: string): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const trimmedText = text.trim();

    // Extract skills (comma or bullet separated lists)
    const skillsPatterns = [
      /skills?:\s*([^\n]+)/i,
      /(?:proficient|skilled|experienced|competent)\s+(?:in|with)(?::|)\s+([^\n]+)/i,
      /technologies?:\s*([^\n]+)/i,
      /(?:I know|I use|experience with)\s+([^\n]+)/i,
    ];

    // 1. Try explicit patterns first
    for (const pattern of skillsPatterns) {
      const match = trimmedText.match(pattern);
      if (match && match[1]) {
        const skillsList = this.parseExplicitSkills(match[1]);

        if (skillsList.length > 0) {
          data.skills = skillsList;
          return data;
        }
      }
    }

    // 2. Fallback: boundary-based keyword matching only (no substring inference)
    const boundaryMatches = SkillsExtractor.TECH_KEYWORDS.filter((keyword) =>
      this.hasBoundaryMatch(trimmedText, keyword)
    );

    if (boundaryMatches.length > 0) {
      data.skills = boundaryMatches;
    }

    return data;
  }

  private parseExplicitSkills(text: string): string[] {
    const parts = text
      .split(/,|;|\n|\s+and\s+/i)
      .map((value) => value.trim().replace(/^[\-\u2022*]\s*/, "").replace(/\.$/, ""))
      .filter((value) => value.length > 0 && value.length <= 50);

    const normalized = parts.filter((value) => {
      const clean = value.toLowerCase();
      return !SkillsExtractor.STOPWORDS.has(clean);
    });

    return [...new Set(normalized)];
  }

  private hasBoundaryMatch(text: string, keyword: string): boolean {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^A-Za-z0-9])${escapedKeyword}([^A-Za-z0-9]|$)`, "i");
    return regex.test(text);
  }
}
