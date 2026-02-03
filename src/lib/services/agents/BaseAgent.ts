import { z } from "zod";
import { generateText } from "../aiGenerationService";
import { logger } from "@/lib/logger";

// --- ZOD SCHEMAS FOR INTER-AGENT COMMUNICATION ---

export const ResearchOutputSchema = z.object({
    summary: z.string().describe("Brief research summary"),
    hiddenRequirements: z.array(z.string()).optional(),
    culturalIndicators: z.array(z.string()).optional(),
});
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

export const PlanOutputSchema = z.object({
    strategicPoints: z.array(z.string()).describe("Bulleted plan items"),
    keywordsToInclude: z.array(z.string()).optional(),
    sectionsToEnhance: z.array(z.string()).optional(),
});
export type PlanOutput = z.infer<typeof PlanOutputSchema>;

export const ExecutionOutputSchema = z.object({
    resumeMarkdown: z.string().describe("The rewritten resume in Markdown"),
});
export type ExecutionOutput = z.infer<typeof ExecutionOutputSchema>;

export const ValidationOutputSchema = z.object({
    status: z.enum(["PASS", "NEEDS_WORK"]),
    critique: z.string().optional(),
    missingKeywords: z.array(z.string()).optional(),
});
export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;

export const PolishOutputSchema = z.object({
    finalResumeMarkdown: z.string().describe("The polished resume in Markdown"),
});
export type PolishOutput = z.infer<typeof PolishOutputSchema>;

export const AuditorOutputSchema = z.object({
    status: z.enum(["PASS", "NEEDS_WORK"]),
    critique: z.string().optional(),
    suggestedTemplateId: z.string().describe("The ID of the recommended template (e.g., executive-v1, modern-v1)"),
    designReasoning: z.string().describe("Explanation for why this template was selected"),
});
export type AuditorOutput = z.infer<typeof AuditorOutputSchema>;

// --- BASE AGENT INTERFACE ---

export interface AgentContext {
    userId: string;
    jobDescription?: string;
    userResume?: string;
    model: string;
    outputFormatInstruction?: string;
}

export interface AgentResult<T> {
    success: boolean;
    data?: T;
    rawText?: string;
    error?: string;
}

export abstract class BaseAgent<TInput, TOutput> {
    protected name: string;
    protected model: string;

    constructor(name: string, model: string) {
        this.name = name;
        this.model = model;
    }

    abstract buildPrompt(input: TInput, context: AgentContext): string;
    abstract parseOutput(rawText: string): TOutput;

    async run(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
        const prompt = this.buildPrompt(input, context);
        logger.info({ agent: this.name, userId: context.userId }, `Agent ${this.name} starting`);

        try {
            const result = await generateText(prompt, 2000, 0.7, this.model);
            const parsed = this.parseOutput(result.text);
            logger.info({ agent: this.name, userId: context.userId }, `Agent ${this.name} complete`);
            return { success: true, data: parsed, rawText: result.text };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({ agent: this.name, err: error }, `Agent ${this.name} failed`);
            return { success: false, error: errorMessage };
        }
    }
}
