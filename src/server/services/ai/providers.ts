import { withRetry } from "@/lib/utils/retry";
import { AI_ENDPOINTS, DEFAULT_STOP_SEQUENCES } from "@/config/aiEndpoints";

export async function callOpenAI(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  options?: { jsonMode?: boolean },
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature,
    stop: [...DEFAULT_STOP_SEQUENCES],
  };

  if (options?.jsonMode) {
    requestBody.response_format = { type: "json_object" };
    delete requestBody.stop;
  }

  const response = await withRetry(() =>
    fetch(AI_ENDPOINTS.OPENAI.CHAT_COMPLETIONS, {
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
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text generated from OpenAI");

  return { text: text.trim(), model: modelId };
}

export async function callGemini(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  options?: { jsonMode?: boolean; responseSchema?: Record<string, unknown> },
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
    stopSequences: [...DEFAULT_STOP_SEQUENCES],
  };

  // Add structured output / JSON mode when requested
  if (options?.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = options.responseSchema;
    delete generationConfig.stopSequences;
  } else if (options?.jsonMode) {
    generationConfig.responseMimeType = "application/json";
    delete generationConfig.stopSequences;
  }

  const response = await withRetry(() =>
    fetch(AI_ENDPOINTS.GEMINI.GENERATE(modelId, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }),
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text generated from Gemini");

  return { text: text.trim(), model: modelId };
}

export async function callAnthropic(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key not configured");

  const response = await withRetry(() =>
    fetch(AI_ENDPOINTS.ANTHROPIC.MESSAGES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
        stop_sequences: [...DEFAULT_STOP_SEQUENCES],
      }),
    }),
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No text generated from Anthropic");

  return { text: text.trim(), model: modelId };
}

export async function callXAI(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("xAI API key not configured");

  const response = await withRetry(() =>
    fetch(AI_ENDPOINTS.XAI.CHAT_COMPLETIONS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
        stop: [...DEFAULT_STOP_SEQUENCES],
      }),
    }),
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text generated from xAI");

  return { text: text.trim(), model: modelId };
}
