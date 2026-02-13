import {
  BaseAgent,
  AgentContext,
  ExecutionOutput, // Reusing existing schema for compatibility
  ExecutionOutputSchema,
  PlanOutput,
} from "./BaseAgent";

export interface WritingAgentInput {
  planOutput: PlanOutput;
}

/**
 * The Writer (Execution + Polish)
 * Consolidates the original Execution and Polish agents into a single high-quality writing pass.
 */
export class WritingAgent extends BaseAgent<
  WritingAgentInput,
  ExecutionOutput
> {
  constructor(model: string) {
    super("WritingAgent", model);
  }

  buildPrompt(input: WritingAgentInput, context: AgentContext): string {
    const planPoints = input.planOutput.strategicPoints
      .map((p, i) => `${i + 1}. ${p}`)
      .join("\n");
    const keywords = input.planOutput.keywordsToInclude?.join(", ") || "";

    return `You are "The Writer", an elite resume writing and editing agent.
Your goal is to transform the user's raw resume into a professional, high-impact document following a strategic plan.

STRATEGIC PLAN:
${planPoints}

KEYWORDS TO INCLUDE:
${keywords}

USER'S CURRENT RESUME:
${context.userResume}
${context.instructions ? `\nADDITIONAL CONTEXT:\n${context.instructions}\n` : ""}
INSTRUCTIONS:
1. Rewrite every section to be action-oriented, using powerful verbs.
2. Quantify achievements with metrics wherever possible (%, $, numbers).
3. Ensure the tone is professional yet human and engaging.
4. Optimize for brevity—remove fluff and filler words.
5. Follow all strategic points in the plan.
6. Use the specific keywords provided.
7. ${context.outputFormatInstruction || "Output the full resume content in Markdown format."}

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
