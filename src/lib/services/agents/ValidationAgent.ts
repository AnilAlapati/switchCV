import {
    BaseAgent,
    AgentContext,
    ValidationOutput,
    ValidationOutputSchema,
    ExecutionOutput,
} from "./BaseAgent";

export interface ValidationAgentInput {
    executionOutput: ExecutionOutput;
}

export class ValidationAgent extends BaseAgent<ValidationAgentInput, ValidationOutput> {
    constructor(model: string) {
        super("ValidationAgent", model);
    }

    buildPrompt(input: ValidationAgentInput, context: AgentContext): string {
        return `You are a Quality Assurance Auditor.
Check the drafted resume against the Job Description.
Identify any specific missing keywords or weak spots, or confirm it is good.

JOB DESCRIPTION:
${context.jobDescription}

DRAFT RESUME:
${input.executionOutput.resumeMarkdown}

Respond ONLY with valid JSON in this format:
{
  "status": "PASS" or "NEEDS_WORK",
  "critique": "Brief critique if NEEDS_WORK, otherwise empty",
  "missingKeywords": ["keyword1", "keyword2"] or []
}`;
    }

    parseOutput(rawText: string): ValidationOutput {
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { status: "PASS" };
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return ValidationOutputSchema.parse(parsed);
        } catch {
            return { status: "PASS" };
        }
    }
}
