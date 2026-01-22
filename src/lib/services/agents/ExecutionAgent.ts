import {
    BaseAgent,
    AgentContext,
    ExecutionOutput,
    ExecutionOutputSchema,
    PlanOutput,
} from "./BaseAgent";

export interface ExecutionAgentInput {
    planOutput: PlanOutput;
}

export class ExecutionAgent extends BaseAgent<ExecutionAgentInput, ExecutionOutput> {
    constructor(model: string) {
        super("ExecutionAgent", model);
    }

    buildPrompt(input: ExecutionAgentInput, context: AgentContext): string {
        const planPoints = input.planOutput.strategicPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
        const keywords = input.planOutput.keywordsToInclude?.join(", ") || "";

        return `You are a professional Resume Writer.
Using the Plan, rewrite the user's resume.

PLAN:
${planPoints}

KEYWORDS TO INCLUDE:
${keywords}

USER RESUME:
${context.userResume}

${context.outputFormatInstruction || "Output the full resume content in Markdown format. DO NOT include explanations."}

Respond ONLY with valid JSON in this format:
{
  "resumeMarkdown": "# Full resume content in Markdown here..."
}`;
    }

    parseOutput(rawText: string): ExecutionOutput {
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { resumeMarkdown: rawText };
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return ExecutionOutputSchema.parse(parsed);
        } catch {
            return { resumeMarkdown: rawText };
        }
    }
}
