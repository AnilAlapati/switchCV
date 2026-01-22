import {
    BaseAgent,
    AgentContext,
    ResearchOutput,
    ResearchOutputSchema,
} from "./BaseAgent";

export class ResearchAgent extends BaseAgent<void, ResearchOutput> {
    constructor(model: string) {
        super("ResearchAgent", model);
    }

    buildPrompt(_input: void, context: AgentContext): string {
        return `You are an expert Corporate Researcher.
Analyze the Job Description to find "hidden" requirements, cultural fit indicators, and industry trends.

JOB DESCRIPTION:
${context.jobDescription || "No specific job description provided."}

Respond ONLY with valid JSON in this format:
{
  "summary": "Brief research summary here",
  "hiddenRequirements": ["requirement1", "requirement2"],
  "culturalIndicators": ["indicator1", "indicator2"]
}`;
    }

    parseOutput(rawText: string): ResearchOutput {
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { summary: rawText };
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return ResearchOutputSchema.parse(parsed);
        } catch {
            // Fallback to treating entire response as summary
            return { summary: rawText };
        }
    }
}
