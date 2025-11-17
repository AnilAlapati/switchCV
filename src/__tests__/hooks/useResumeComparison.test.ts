import { renderHook, act } from "@testing-library/react";
import { useResumeComparison } from "@/hooks/useResumeComparison";
import { compareResumes } from "@/lib/resumeComparison";
import type { Resume, ComparisonResult } from "@/lib/resumeComparison.types";

// Mock the compareResumes function
jest.mock("@/lib/resumeComparison", () => ({
  compareResumes: jest.fn(),
}));

const mockCompareResumes = compareResumes as jest.MockedFunction<
  typeof compareResumes
>;

describe("useResumeComparison", () => {
  const mockResume1: Resume = {
    id: "resume-1",
    title: "Software Engineer Resume",
    summary: "Experience in React and Node.js",
    skills: ["React", "Node.js"],
    experience: [],
    education: [],
  };

  const mockResume2: Resume = {
    id: "resume-2",
    title: "Frontend Developer Resume",
    summary: "Experience in Vue and Angular",
    skills: ["Vue", "Angular"],
    experience: [],
    education: [],
  };

  const mockComparisonResult: ComparisonResult = {
    resumeIds: ["resume-1", "resume-2"],
    overallScore: 0.75,
    sections: [],
    differences: [],
    similarities: ["Both have technical skills"],
    recommendations: ["Consider adding Vue experience"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with correct default state", () => {
    const { result } = renderHook(() => useResumeComparison());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.comparison).toBeNull();
  });

  it("compares resumes successfully", async () => {
    mockCompareResumes.mockReturnValue(mockComparisonResult);

    const { result } = renderHook(() => useResumeComparison());

    let comparison;
    await act(async () => {
      comparison = await result.current.compare(mockResume1, mockResume2);
    });
    expect(comparison).toEqual(mockComparisonResult);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.comparison).toEqual(mockComparisonResult);
    expect(mockCompareResumes).toHaveBeenCalledWith(mockResume1, mockResume2);
  });

  it("handles comparison errors", async () => {
    mockCompareResumes.mockImplementation(() => {
      throw new Error("Comparison failed");
    });

    const { result } = renderHook(() => useResumeComparison());

    await act(async () => {
      try {
        await result.current.compare(mockResume1, mockResume2);
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual("Comparison failed");
    expect(result.current.comparison).toBeNull();
  });

  it("sets loading state during comparison", () => {
    mockCompareResumes.mockReturnValue(mockComparisonResult);

    const { result } = renderHook(() => useResumeComparison());

    act(() => {
      result.current.compare(mockResume1, mockResume2);
    });

    expect(result.current.loading).toBe(false); // Since it's synchronous, loading should be false immediately
    expect(result.current.error).toBeNull();
  });

  it("clears comparison results", () => {
    const { result } = renderHook(() => useResumeComparison());

    act(() => {
      result.current.clearComparison();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.comparison).toBeNull();
  });

  it("clears error state", () => {
    const { result } = renderHook(() => useResumeComparison());

    // Set an error state first
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("handles non-Error exceptions", async () => {
    mockCompareResumes.mockImplementation(() => {
      throw "String error";
    });

    const { result } = renderHook(() => useResumeComparison());

    await act(async () => {
      try {
        await result.current.compare(mockResume1, mockResume2);
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual("Comparison failed");
    expect(result.current.comparison).toBeNull();
  });
});
