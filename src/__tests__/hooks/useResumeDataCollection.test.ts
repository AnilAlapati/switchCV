import { renderHook, act } from "@testing-library/react";
import { useResumeDataCollection } from "../../hooks/useResumeDataCollection";

describe("useResumeDataCollection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useResumeDataCollection());

    expect(result.current.stage).toBe("initial");
    expect(result.current.resumeData).toEqual({});
  });

  it("should initialize from session storage", () => {
    const storedState = {
      stage: "experience",
      resumeData: { jobTarget: "Developer" },
    };
    sessionStorage.setItem(
      "switchcv_conversation_session",
      JSON.stringify(storedState)
    );

    const { result } = renderHook(() => useResumeDataCollection());

    expect(result.current.stage).toBe("experience");
    expect(result.current.resumeData).toEqual({ jobTarget: "Developer" });
  });

  it("should update stage", () => {
    const { result } = renderHook(() => useResumeDataCollection());

    act(() => {
      result.current.setStage("job_target");
    });

    expect(result.current.stage).toBe("job_target");
    expect(sessionStorage.getItem("switchcv_conversation_session")).toContain(
      "job_target"
    );
  });

  it("should advance stage", () => {
    const { result } = renderHook(() => useResumeDataCollection());

    act(() => {
      result.current.advanceStage("skills");
    });

    expect(result.current.stage).toBe("skills");
  });

  it("should set resume data", () => {
    const { result } = renderHook(() => useResumeDataCollection());
    const newData = { jobTarget: "Manager" };

    act(() => {
      result.current.setResumeData(newData);
    });

    expect(result.current.resumeData).toEqual(newData);
  });

  it("should update resume data", () => {
    const { result } = renderHook(() => useResumeDataCollection());

    act(() => {
      result.current.setResumeData({ jobTarget: "Dev" });
    });

    act(() => {
      result.current.updateResumeData({ experience: "5 years" });
    });

    expect(result.current.resumeData).toEqual({
      jobTarget: "Dev",
      experience: "5 years",
    });
  });

  it("should reset collection", () => {
    const { result } = renderHook(() => useResumeDataCollection());

    act(() => {
      result.current.setStage("complete");
      result.current.setResumeData({ jobTarget: "CEO" });
    });

    act(() => {
      result.current.resetCollection();
    });

    expect(result.current.stage).toBe("initial");
    expect(result.current.resumeData).toEqual({});
    // The useEffect will re-save the initial state to storage
    expect(sessionStorage.getItem("switchcv_conversation_session")).toContain(
      "initial"
    );
  });
});
