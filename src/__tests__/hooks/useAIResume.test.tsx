// src/__tests__/hooks/useAIResume.test.tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAIResume } from "@/hooks/useAIResume";
import { getAuth } from "firebase/auth";
import { generateMockEnhancedResume } from "@/lib/mockAIResume";
import { getBestModelForTask } from "@/config/aiModels";

// Mock Firebase auth
jest.mock("@/lib/firebase", () => ({
  auth: {},
}));

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("@/lib/mockAIResume", () => ({
  generateMockEnhancedResume: jest.fn(),
}));

jest.mock("@/config/aiModels", () => ({
  getBestModelForTask: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockGetAuth = jest.mocked(getAuth);
const mockGenerateMockEnhancedResume = jest.mocked(generateMockEnhancedResume);
const mockGetBestModelForTask = jest.mocked(getBestModelForTask);

const mockFallbackContent = {
  enhancedSummary: "Mock summary",
  enhancedExperience: [
    {
      title: "Professional",
      company: "Your Organization",
      duration: "2020 - Present",
      description: "Mock description",
      achievements: ["Achievement"],
      enhancedDescription: "Enhanced description",
    },
  ],
  skillSuggestions: ["Skill"],
  improvementTips: ["Tip"],
};

describe("useAIResume", () => {
  let mockUser: any;
  let mockGetIdToken: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetIdToken = jest.fn();
    mockUser = {
      uid: "test-user-id",
      getIdToken: mockGetIdToken,
    };

    mockGetAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);
    mockGenerateMockEnhancedResume.mockImplementation(
      () => mockFallbackContent
    );
    mockGetBestModelForTask.mockReturnValue({
      modelId: "mock-model-id",
      provider: "mock-provider",
    } as any);
  });

  describe("generateResumeContent", () => {
    const mockResumeData = {
      personalInfo: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        location: "New York, NY",
        linkedin: "linkedin.com/in/johndoe",
        github: "github.com/johndoe",
      },
      summary: "Experienced software developer",
      experience: [
        {
          title: "Senior Developer",
          company: "Tech Corp",
          duration: "2020-Present",
          description: "Developed web applications",
          achievements: ["Increased performance by 30%"],
        },
      ],
      education: [
        {
          degree: "BS Computer Science",
          institution: "University",
          year: "2019",
          gpa: "3.8",
        },
      ],
      skills: ["JavaScript", "React", "Node.js"],
      projects: [
        {
          name: "Portfolio Website",
          description: "Personal portfolio",
          technologies: ["React", "Next.js"],
          url: "https://portfolio.com",
        },
      ],
    };

    const mockEnhancedContent = {
      enhancedSummary: "Highly skilled software developer with 5+ years...",
      enhancedExperience: [
        {
          title: "Senior Developer",
          company: "Tech Corp",
          duration: "2020-Present",
          description: "Developed web applications",
          achievements: ["Increased performance by 30%"],
          enhancedDescription:
            "Led development of critical web applications...",
        },
      ],
      skillSuggestions: ["TypeScript", "AWS"],
      improvementTips: ["Add more quantifiable achievements"],
    };

    it("should generate resume content successfully", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockEnhancedContent }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAIResume());

      const content = await result.current.generateResumeContent(
        mockResumeData
      );

      expect(mockGetAuth).toHaveBeenCalled();
      expect(mockGetIdToken).toHaveBeenCalled();

      // Check that fetch was called with the right URL and method
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/ai/generate-resume",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer mock-id-token",
          }),
        })
      );

      const [, fetchOptions] = mockFetch.mock.calls[0];
      const parsedBody = JSON.parse((fetchOptions?.body as string) || "{}");
      expect(parsedBody).toEqual({
        resumeData: mockResumeData,
        template: "modern",
        tone: "professional",
        modelId: "mock-model-id",
      });

      expect(content).toEqual(mockEnhancedContent);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle custom parameters", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockEnhancedContent }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAIResume());

      await result.current.generateResumeContent(
        mockResumeData,
        "minimalist",
        "creative",
        "gpt-4"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/ai/generate-resume",
        expect.anything()
      );
      const [, fetchOptions] = mockFetch.mock.calls.at(-1)!;
      const parsedBody = JSON.parse((fetchOptions?.body as string) || "{}");
      expect(parsedBody).toEqual({
        resumeData: mockResumeData,
        template: "minimalist",
        tone: "creative",
        modelId: "gpt-4",
      });
    });

    it("should handle unauthenticated user", async () => {
      mockGetAuth.mockReturnValue({
        currentUser: null,
      } as any);

      const { result } = renderHook(() => useAIResume());

      let content: any;
      await act(async () => {
        content = await result.current.generateResumeContent(mockResumeData);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(content).toEqual(mockFallbackContent);
      expect(mockGenerateMockEnhancedResume).toHaveBeenCalledWith(
        mockResumeData.personalInfo.name,
        "Professional",
        "Your Organization",
        mockResumeData.skills
      );
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should handle getIdToken error", async () => {
      mockGetIdToken.mockRejectedValue(new Error("Token error"));

      const { result } = renderHook(() => useAIResume());

      let content: any;
      await act(async () => {
        content = await result.current.generateResumeContent(mockResumeData);
      });

      expect(content).toEqual(mockFallbackContent);
      expect(mockGenerateMockEnhancedResume).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should handle API error response", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: "API Error" }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAIResume());

      let content: any;
      await act(async () => {
        content = await result.current.generateResumeContent(mockResumeData);
      });

      expect(content).toEqual(mockFallbackContent);
      expect(mockGenerateMockEnhancedResume).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should handle network error", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAIResume());

      let content: any;
      await act(async () => {
        content = await result.current.generateResumeContent(mockResumeData);
      });

      expect(content).toEqual(mockFallbackContent);
      expect(mockGenerateMockEnhancedResume).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should handle malformed API response", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAIResume());

      let content: any;
      await act(async () => {
        content = await result.current.generateResumeContent(mockResumeData);
      });

      expect(content).toEqual(mockFallbackContent);
      expect(mockGenerateMockEnhancedResume).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should set loading state during request", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockEnhancedContent }),
      };

      mockFetch.mockImplementation(() => fetchPromise);

      const { result } = renderHook(() => useAIResume());

      const generatePromise =
        result.current.generateResumeContent(mockResumeData);

      // Check loading is true during request
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the fetch
      resolveFetch!(mockResponse);

      // Wait for completion
      await generatePromise;

      // Check loading is false after completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should clear previous error on new request", async () => {
      mockGetIdToken.mockResolvedValue("mock-id-token");

      // First request fails and fallback also fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      mockGenerateMockEnhancedResume.mockImplementationOnce(() => {
        throw new Error("mock fallback failure");
      });

      const { result } = renderHook(() => useAIResume());

      await act(async () => {
        await result.current.generateResumeContent(mockResumeData);
      });
      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      // Second request succeeds via live endpoint
      const mockSuccessResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockEnhancedContent }),
      };
      mockFetch.mockResolvedValueOnce(mockSuccessResponse);
      mockGenerateMockEnhancedResume.mockImplementation(
        () => mockFallbackContent
      );

      await act(async () => {
        await result.current.generateResumeContent(mockResumeData);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("initial state", () => {
    it("should return initial state", () => {
      const { result } = renderHook(() => useAIResume());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.generateResumeContent).toBe("function");
    });
  });
});
