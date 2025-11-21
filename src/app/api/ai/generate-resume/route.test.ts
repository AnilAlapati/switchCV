import { POST } from "./route";
import { NextRequest } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";

jest.mock("@/lib/services/aiGenerationService");

describe("POST /api/ai/generate-resume", () => {
  const mockResumeData = {
    personalInfo: {
      name: "John Doe",
      email: "john@example.com",
    },
    summary: "Experienced developer",
    skills: ["JavaScript", "React"],
    experience: [
      {
        title: "Frontend Dev",
        company: "Tech Corp",
        duration: "2020-Present",
        description: "Built UI",
      },
    ],
    education: [
      {
        degree: "BS CS",
        institution: "University",
        year: "2020",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if resume data is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Missing resume data");
  });

  it("should generate enhanced resume successfully", async () => {
    const mockAIResponse = {
      enhancedSummary: "Enhanced summary text",
      enhancedExperience: [
        {
          title: "Frontend Dev",
          company: "Tech Corp",
          duration: "2020-Present",
          description: "Built UI",
          enhancedDescription: "Enhanced description",
          achievements: ["Achievement 1"],
        },
      ],
      skillSuggestions: ["TypeScript"],
      improvementTips: ["Add metrics"],
    };

    (generateText as jest.Mock).mockResolvedValue({
      text: JSON.stringify(mockAIResponse),
      model: "gpt-4",
      provider: "openai",
    });

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.enhancedSummary).toBe("Enhanced summary text");
    expect(generateText).toHaveBeenCalled();
  });

  it("should handle AI service errors", async () => {
    (generateText as jest.Mock).mockRejectedValue(
      new Error("AI Service Error")
    );

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("AI Service Error");
  });

  it("should use fallback if AI response is invalid JSON", async () => {
    (generateText as jest.Mock).mockResolvedValue({
      text: "Invalid JSON response",
      model: "gpt-4",
      provider: "openai",
    });

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Check for fallback content
    expect(data.data.enhancedSummary).toContain("Results-driven professional");
  });
});
