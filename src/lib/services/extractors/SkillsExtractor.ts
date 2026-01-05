import { ResumeDataRequirements } from "../../conversationManager";
import { IExtractor } from "./IExtractor";

export class SkillsExtractor implements IExtractor {
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
                const skillsList = match[1]
                    .split(/,|;|\n|\s+and\s+/)
                    .map((s) => s.trim().replace(/\.$/, ""))
                    .filter((s) => s.length > 0 && s.length < 50);

                if (skillsList.length > 0) {
                    data.skills = skillsList;
                    return data;
                }
            }
        }

        // 2. Fallback: Look for lines containing tech keywords
        const techKeywords = [
            "Java", "Python", "React", "Node.js", "AWS", "Docker", "SQL", "NoSQL",
            "TypeScript", "Go", "Rust", "HTML", "CSS", "Git", "C++", "C#",
            "Kubernetes", "CI/CD", "Agile", "Scrum", "JavaScript", "Svelte", "Vue",
            "Nuxt", "Next.js", "Tailwind", "Bootstrap", "Sass", "Less", "GraphQL",
            "MongoDB", "PostgreSQL", "Firebase", "Supabase", "Flutter", "React Native",
            "Swift", "Kotlin", "PHP", "Ruby", "Rails", "Laravel", "Django", "Flask",
            "FastAPI", "Spring", ".NET", "Azure", "GCP", "Linux", "Bash", "Redis",
            "Elasticsearch",
        ];

        const lines = trimmedText.split("\n");
        const foundSkills: string[] = [];

        for (const line of lines) {
            const keywordsInLine = techKeywords.filter((kw) =>
                line.toLowerCase().includes(kw.toLowerCase())
            );

            if (keywordsInLine.length >= 1) {
                const hasComma = line.includes(",");
                const parts = hasComma
                    ? line.split(/,|;|\s+and\s+/)
                    : line.split(/\s+and\s+|\s+/);

                parts.forEach((p) => {
                    const clean = p.trim().replace(/[^a-zA-Z0-9+#.]/g, "");
                    if (
                        clean.length > 1 &&
                        clean.length < 20 &&
                        !["and", "with", "i", "know", "use", "the", "a"].includes(clean.toLowerCase())
                    ) {
                        foundSkills.push(clean);
                    }
                });
            }
        }

        if (foundSkills.length > 0) {
            data.skills = [...new Set(foundSkills)];
        }

        return data;
    }
}
