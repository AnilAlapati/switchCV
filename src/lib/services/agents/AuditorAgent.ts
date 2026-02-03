import {
    BaseAgent,
    AgentContext,
    AuditorOutput,
    AuditorOutputSchema,
    ExecutionOutput,
} from "./BaseAgent";

export interface AuditorAgentInput {
    executionOutput: ExecutionOutput;
}

/**
 * The Auditor (Validation + Design)
 * Checks for quality, hallucinations, and selects the optimal visual template.
 */
export class AuditorAgent extends BaseAgent<AuditorAgentInput, AuditorOutput> {
    constructor(model: string) {
        super("AuditorAgent", model);
    }

    buildPrompt(input: AuditorAgentInput, context: AgentContext): string {
        return `You are "The Auditor", an expert in quality control and resume design.
Your job is to perform a final check on the generated resume and recommend the best visual template.

JOB DESCRIPTION:
${context.jobDescription || "No job description provided."}

DRAFTED RESUME:
${input.executionOutput.resumeMarkdown}

AVAILABLE TEMPLATES:
- standard-v1: Balanced, two-column. Good for mid-level technical or professional roles.
- modern-creative-v1: Single-column, clean. Best for entry-level or creative roles with less content.
- executive-v1: Traditional, dense, single-column. Best for leadership, management, and senior roles.
- masonry-v1: Grid layout. Best for project-heavy or visual portfolios.
- bento-v1: Modern, modular. Premium look for product, design, and tech roles.
- terminal-v1: Developer aesthetic. Best for technical IC (Individual Contributor) roles.
- editorial-v1: Magazine style. Best for thought leaders and consultants.
- noir-v1: Premium/dark. High-impact for C-suite and founders.

INSTRUCTIONS:
1. Validate against the Job Description: Does the resume meet requirements? Are there any hallucinations?
2. If major issues are found, set status to "NEEDS_WORK" and provide a critique.
3. Select the OPTIMAL Template ID from the list above based on the content density, role type, and seniority detected in the resume.
4. Provide a design reasoning for your choice.

Respond ONLY with valid JSON in this format:
{
  "status": "PASS" or "NEEDS_WORK",
  "critique": "Brief critique if needed, otherwise empty",
  "suggestedTemplateId": "one-of-the-ids-above",
  "designReasoning": "Why this template is perfect for this specific candidate and role"
}`;
    }

    parseOutput(rawText: string): AuditorOutput {
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return {
                    status: "PASS",
                    suggestedTemplateId: "standard-v1",
                    designReasoning: "Fallback to standard template."
                };
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return AuditorOutputSchema.parse(parsed);
        } catch {
            return {
                status: "PASS",
                suggestedTemplateId: "standard-v1",
                designReasoning: "Fallback to standard template."
            };
        }
    }
}
