import {
    BaseAgent,
    AgentContext,
    PolishOutput,
    PolishOutputSchema,
    ExecutionOutput,
    ValidationOutput,
} from "./BaseAgent";

export interface PolishAgentInput {
    executionOutput: ExecutionOutput;
    validationOutput: ValidationOutput;
}

export class PolishAgent extends BaseAgent<PolishAgentInput, PolishOutput> {
    constructor(model: string) {
        super("PolishAgent", model);
    }

    buildPrompt(input: PolishAgentInput, context: AgentContext): string {
        const critique =
            input.validationOutput.status === "NEEDS_WORK"
                ? `CRITIQUE:\n${input.validationOutput.critique}\n\nMISSING KEYWORDS:\n${(input.validationOutput.missingKeywords || []).join(", ")}`
                : "CRITIQUE:\nThe resume passed validation. Focus on tone and brevity.";

        return `You are an Expert Editor.
Refine the resume based on the Auditor's critique.
Improve tone, brevity, and impact.

${critique}

DRAFT RESUME:
${input.executionOutput.resumeMarkdown}

${context.outputFormatInstruction || "Output the final resume content in Markdown."}

Respond ONLY with valid JSON in this format:
{
  "finalResumeMarkdown": "# Final polished resume in Markdown here..."
}`;
    }

    parseOutput(rawText: string): PolishOutput {
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { finalResumeMarkdown: rawText };
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return PolishOutputSchema.parse(parsed);
        } catch {
            return { finalResumeMarkdown: rawText };
        }
    }
}
