import { withRetry } from "@/lib/utils/retry";
import { AI_ENDPOINTS, DEFAULT_STOP_SEQUENCES } from "@/config/aiEndpoints";
import {
  fetchWithTimeout,
  validateContextWindow,
  TokenUsage,
} from "../core-utils";

/**
 * Generate text using Groq API (fast inference)
 *
 * @param prompt - The prompt text
 * @param maxTokens - Max output tokens (default 150)
 * @param temperature - Temperature (default 0.7)
 * @param jsonMode - When true, request JSON response format
 */
export async function generateWithGroq(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
  jsonMode: boolean = false,
): Promise<{ text: string; model: string; usage?: TokenUsage }> {
  const { getSecret } = await import("@/lib/services/secretManagerService");
  const apiKey = await getSecret("GROQ_API_KEY");

  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const model = "llama-3.3-70b-versatile"; // Fast and free tier available

  await validateContextWindow(prompt, model);

  const requestBody: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature,
    stop: [...DEFAULT_STOP_SEQUENCES],
  };

  // Add JSON mode when requested (OpenAI-compatible)
  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
    delete requestBody.stop;
  }

  const response = await withRetry(() =>
    fetchWithTimeout(AI_ENDPOINTS.GROQ.CHAT_COMPLETIONS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }),
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No text generated from Groq");
  }

  // Parse usage from Groq response (OpenAI-compatible format)
  const usage: TokenUsage | undefined = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      }
    : undefined;

  return {
    text: text.trim(),
    model,
    usage,
  };
}
