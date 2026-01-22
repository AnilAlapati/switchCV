import {
    BaseAgent,
    AgentContext,
    PlanOutput,
    PlanOutputSchema,
    ResearchOutput,
} from "./BaseAgent";

export interface PlanningAgentInput {
    researchOutput?: ResearchOutput;
}

export class PlanningAgent extends BaseAgent<PlanningAgentInput, PlanOutput> {
    constructor(model: string) {
        super("PlanningAgent", model);
    }

    buildPrompt(input: PlanningAgentInput, context: AgentContext): string {
        const researchSection = input.researchOutput
            ? `RESEARCH SUMMARY:\n${input.researchOutput.summary}\n\nHIDDEN REQUIREMENTS:\n${(input.researchOutput.hiddenRequirements || []).join(", ")}`
            : "";

        return `You are an expert Resume Strategist.
Analyze the Job Description, Research, and User Resume.
Create a bulleted plan to tailor the resume.

JOB DESCRIPTION:
${context.jobDescription || "No specific job description provided."}

${researchSection}

USER RESUME:
${context.userResume || "No specific resume content provided."}

Respond ONLY with valid JSON in this format:
{
  "strategicPoints": ["Point 1", "Point 2", "Point 3"],
  "keywordsToInclude": ["keyword1", "keyword2"],
  "sectionsToEnhance": ["Experience", "Skills"]
}`;
    }

    parseOutput(rawText: string): PlanOutput {
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { strategicPoints: [rawText] };
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return PlanOutputSchema.parse(parsed);
        } catch {
            return { strategicPoints: [rawText] };
        }
    }
}
