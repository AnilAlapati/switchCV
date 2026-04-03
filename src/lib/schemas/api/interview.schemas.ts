import { z } from "zod";

/** Validates the start-session action for POST /api/interview/assistant. */
export const StartInterviewSessionSchema = z
  .object({
    action: z.literal("start-session"),
    jobTitle: z.string().min(1).max(200),
    jobDescription: z.string().max(10000).optional(),
    companyName: z.string().max(200).optional(),
    numberOfQuestions: z.number().int().min(1).max(20).optional(),
  })
  .strict();

/** Validates the submit-answer action for POST /api/interview/assistant. */
export const SubmitInterviewAnswerSchema = z
  .object({
    action: z.literal("submit-answer"),
    sessionId: z.string().min(1),
    questionIndex: z.number().int().min(0),
    answer: z.string().min(1),
    duration: z.number().min(0).optional(),
  })
  .strict();

/** Validates the complete-session action for POST /api/interview/assistant. */
export const CompleteInterviewSessionSchema = z
  .object({
    action: z.literal("complete-session"),
    sessionId: z.string().min(1),
  })
  .strict();

/** Validates input for POST /api/interview/assistant. */
export const InterviewAssistantActionSchema = z.discriminatedUnion("action", [
  StartInterviewSessionSchema,
  SubmitInterviewAnswerSchema,
  CompleteInterviewSessionSchema,
]);

/** Validates query params for GET /api/interview/assistant?action=tips. */
export const InterviewTipsQuerySchema = z.object({
  action: z.literal("tips"),
  jobTitle: z.string().min(1).max(200).optional(),
});

export type InterviewAssistantActionInput = z.infer<
  typeof InterviewAssistantActionSchema
>;
export type InterviewTipsQueryInput = z.infer<typeof InterviewTipsQuerySchema>;
