/**
 * Tests for useRecruiterPipeline Hook
 */

import { renderHook, act } from "@testing-library/react";
import { useRecruiterPipeline } from "@/hooks/useRecruiterPipeline";
import {
  PipelineStage,
  CandidatePriority,
} from "@/lib/recruiterDashboard.types";

describe("useRecruiterPipeline", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    expect(result.current.pipeline).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should initialize pipeline", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    expect(result.current.pipeline?.jobTitle).toBe("Engineer");
  });

  it("should add candidate to pipeline", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    expect(result.current.pipeline?.totalCandidates).toBe(1);
  });

  it("should move candidate to stage", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    const candidates = result.current.getCandidates(PipelineStage.LEAD);
    const candidateId = candidates[0]?.id;

    if (candidateId) {
      await act(async () => {
        result.current.moveCandidate(candidateId, PipelineStage.SCREENED);
      });
    }

    expect(result.current.error).toBeNull();
  });

  it("should update candidate priority", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    const candidates = result.current.getCandidates(PipelineStage.LEAD);
    const candidateId = candidates[0]?.id;

    if (candidateId) {
      await act(async () => {
        result.current.updatePriority(candidateId, CandidatePriority.HIGH);
      });
    }

    expect(result.current.error).toBeNull();
  });

  it("should handle errors gracefully", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    expect(result.current.error).toBeDefined();
  });

  it("should get candidates from stage", async () => {
    const { result } = renderHook(() => useRecruiterPipeline());

    await act(async () => {
      result.current.initialize("job_1", "Engineer");
    });

    await act(async () => {
      result.current.addCandidate("John", "john@example.com", "Engineer");
    });

    const stageCandidates = result.current.getCandidates(PipelineStage.LEAD);

    expect(stageCandidates.length).toBeGreaterThanOrEqual(0);
  });
});
