import { withRetry } from "@/lib/utils/retry";
import { AI_ENDPOINTS, DEFAULT_STOP_SEQUENCES } from "@/config/aiEndpoints";
import { fetchWithTimeout, validateContextWindow, TokenUsage } from "../core-utils";

/**
 * Generate text using OpenAI API
 */
export async function generateWithOpenAI(
    prompt: string,
    maxTokens: number = 150,
    temperature: number = 0.7,
): Promise<{ text: string; model: string; usage?: TokenUsage }> {
    const { getSecret } = await import("@/lib/services/secretManagerService");
    const apiKey = await getSecret("OPENAI_API_KEY");

    if (!apiKey) {
        throw new Error("OpenAI API key not configured");
    }

    const model = "gpt-4o-mini"; // Fast and cheap

    await validateContextWindow(prompt, model);

    const response = await withRetry(() =>
        fetchWithTimeout(AI_ENDPOINTS.OPENAI.CHAT_COMPLETIONS, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens,
                temperature,
                stop: [...DEFAULT_STOP_SEQUENCES],
            }),
        }),
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
        throw new Error("No text generated from OpenAI");
    }

    // Parse usage from OpenAI response
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
