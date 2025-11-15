import { POST } from "@/app/api/ai/generate/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/services/aiGenerationService");

const { generateText } = require("@/lib/services/aiGenerationService");

describe("/api/ai/generate route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully generate text with valid prompt", async () => {
    const mockResult = {
      text: "Generated resume bullet point",
      model: "gemini-2.5-flash",
      provider: "google",
    };

    generateText.mockResolvedValueOnce(mockResult);

    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "Create a professional resume bullet" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe("Generated resume bullet point");
    expect(data.provider).toBe("google");
  });

  it("should return 400 error when prompt is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt is required");
  });

  it("should return 400 error when prompt is empty", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt is required");
  });

  it("should pass custom maxTokens and temperature to service", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.0-flash",
      provider: "google",
    };

    generateText.mockResolvedValueOnce(mockResult);

    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Test",
        maxTokens: 300,
        temperature: 0.5,
      }),
    });

    const response = await POST(request);
    await response.json();

    expect(generateText).toHaveBeenCalledWith("Test", 300, 0.5);
  });

  it("should handle errors from generateText", async () => {
    generateText.mockRejectedValueOnce(new Error("All providers failed"));

    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "Test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(data.message).toContain("failed");
  });

  it("should handle HuggingFace fallback provider", async () => {
    const mockResult = {
      text: "HuggingFace generated",
      model: "FLAN-T5 Base",
      provider: "huggingface",
    };

    generateText.mockResolvedValueOnce(mockResult);

    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "Test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("huggingface");
  });

  it("should use default parameters when not provided", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.0-flash",
      provider: "google",
    };

    generateText.mockResolvedValueOnce(mockResult);

    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "Test prompt" }),
    });

    const response = await POST(request);
    await response.json();

    expect(generateText).toHaveBeenCalledWith("Test prompt", 150, 0.9);
  });

  it("should handle special characters in prompts", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.5-flash",
      provider: "google",
    };

    generateText.mockResolvedValueOnce(mockResult);

    const specialPrompt = 'Create: "bullet" with @#$% & characters!';
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: specialPrompt }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith(specialPrompt, 150, 0.9);
  });

  it("should handle very long prompts", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.5-flash",
      provider: "google",
    };

    generateText.mockResolvedValueOnce(mockResult);

    const longPrompt = "A".repeat(5000);
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: longPrompt }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
  });

  it("should handle malformed JSON gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      body: "invalid json",
    });

    // Override json() to throw
    Object.defineProperty(request, "json", {
      value: jest.fn().mockRejectedValueOnce(new SyntaxError("Invalid JSON")),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
  });
});
