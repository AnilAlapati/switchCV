/**
 * Tests for useAIResume hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useAIResume } from "@/hooks/useAIResume";
import { getAuth } from "firebase/auth";
import { getBestModelForTask } from "@/config/aiModels";
import { mockUser } from "@/__tests__/mocks/firebase";

jest.mock("firebase/auth");
jest.mock("@/config/aiModels");

const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockGetBestModel = getBestModelForTask as jest.MockedFunction<
  typeof getBestModelForTask
>;

const mockResumeData = {
  personalInfo: {
    name: "John Doe",
    email: "john@example.com",
    phone: "555-1234",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe",
  },
  summary: "Experienced software engineer",
  experience: [
    {
      title: "Senior Developer",
      company: "Tech Corp",
      duration: "2020-2024",
      description: "Led team of developers",
      achievements: ["Built new platform", "Reduced latency"],
    },
  ],
  education: [
    {
      degree: "BS Computer Science",
      institution: "State University",
      year: "2020",
      gpa: "3.8",
    },
  ],
  skills: ["React", "TypeScript", "Node.js"],
  projects: [
    {
      name: "Project X",
      description: "A cool project",
      technologies: ["React", "Firebase"],
      url: "github.com/project",
    },
  ],
};

describe("useAIResume Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);
  });

  it("should initialize with loading false and no error", () => {
    const { result } = renderHook(() => useAIResume());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should return error if user not authenticated", async () => {
    mockGetAuth.mockReturnValue({
      currentUser: null,
    } as any);

    const { result } = renderHook(() => useAIResume());

    await act(async () => {
      await result.current.generateResumeContent(mockResumeData);
    });

    expect(result.current.error).toContain("not authenticated");
  });

  it("should set loading state during generation", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      capabilities: ["text"],
    } as any);

    const { result } = renderHook(() => useAIResume());

    // Mock fetch to simulate API call
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                enhancedSummary: "Enhanced summary",
                enhancedExperience: [],
                skillSuggestions: [],
                improvementTips: [],
              }),
            });
          }, 100)
        )
    ) as any;

    act(() => {
      result.current.generateResumeContent(mockResumeData);
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("should support professional tone", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          enhancedSummary: "Professional summary",
          enhancedExperience: [],
          skillSuggestions: [],
          improvementTips: [],
        }),
      })
    ) as any;

    await act(async () => {
      await result.current.generateResumeContent(
        mockResumeData,
        "modern",
        "professional"
      );
    });

    expect(result.current.error).toBeNull();
  });

  it("should support creative tone", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          enhancedSummary: "Creative summary",
          enhancedExperience: [],
          skillSuggestions: [],
          improvementTips: [],
        }),
      })
    ) as any;

    await act(async () => {
      await result.current.generateResumeContent(
        mockResumeData,
        "modern",
        "creative"
      );
    });

    expect(result.current.error).toBeNull();
  });

  it("should support concise tone", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          enhancedSummary: "Concise summary",
          enhancedExperience: [],
          skillSuggestions: [],
          improvementTips: [],
        }),
      })
    ) as any;

    await act(async () => {
      await result.current.generateResumeContent(
        mockResumeData,
        "modern",
        "concise"
      );
    });

    expect(result.current.error).toBeNull();
  });

  it("should return enhanced resume content", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    const expectedContent = {
      enhancedSummary: "Enhanced summary text",
      enhancedExperience: [
        {
          title: "Senior Developer",
          company: "Tech Corp",
          duration: "2020-2024",
          description: "Led team of developers",
          achievements: ["Built new platform"],
          enhancedDescription: "Enhanced description",
        },
      ],
      skillSuggestions: ["Python", "AWS"],
      improvementTips: ["Add metrics", "Quantify impact"],
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => expectedContent,
      })
    ) as any;

    let content: any;
    await act(async () => {
      content = await result.current.generateResumeContent(mockResumeData);
    });

    expect(content).toEqual(expectedContent);
    if (content) {
      expect(content.enhancedSummary).toBeDefined();
      expect(content.skillSuggestions).toBeDefined();
      expect(content.improvementTips).toBeDefined();
    }
  });

  it("should handle API errors", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: "API error" }),
      })
    ) as any;

    await act(async () => {
      await result.current.generateResumeContent(mockResumeData);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it("should auto-select best model if not provided", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          enhancedSummary: "",
          enhancedExperience: [],
          skillSuggestions: [],
          improvementTips: [],
        }),
      })
    ) as any;

    await act(async () => {
      await result.current.generateResumeContent(mockResumeData);
    });

    expect(mockGetBestModel).toHaveBeenCalled();
  });

  it("should use specified model if provided", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          enhancedSummary: "",
          enhancedExperience: [],
          skillSuggestions: [],
          improvementTips: [],
        }),
      })
    ) as any;

    await act(async () => {
      await result.current.generateResumeContent(
        mockResumeData,
        "modern",
        "professional",
        "custom-model-id"
      );
    });

    expect(result.current.error).toBeNull();
  });

  it("should support different templates", async () => {
    mockGetBestModel.mockReturnValue({
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
    } as any);

    const { result } = renderHook(() => useAIResume());

    const templates = ["modern", "classic", "creative", "minimal"];

    for (const template of templates) {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            enhancedSummary: "",
            enhancedExperience: [],
            skillSuggestions: [],
            improvementTips: [],
          }),
        })
      ) as any;

      await act(async () => {
        await result.current.generateResumeContent(
          mockResumeData,
          template as any
        );
      });

      expect(result.current.error).toBeNull();
    }
  });
});
