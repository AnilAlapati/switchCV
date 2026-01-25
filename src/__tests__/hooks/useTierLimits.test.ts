import { renderHook, act } from "@testing-library/react";
import { useTierLimits } from "@/hooks/useTierLimits";
import useSWR from "swr";

// Mock useSWR
jest.mock("swr");

describe("useTierLimits hook", () => {
    const mockMutate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useSWR as jest.Mock).mockReturnValue({
            data: null,
            error: null,
            isLoading: false,
            mutate: mockMutate,
        });
    });

    it("returns default limits when no data is provided", () => {
        const { result } = renderHook(() => useTierLimits());
        expect(result.current.limits.basic.resumeCreationLimit).toBe(1);
        expect(result.current.limits.premium.resumeCreationLimit).toBe(50);
    });

    it("returns customized limits from data when provided", () => {
        (useSWR as jest.Mock).mockReturnValue({
            data: {
                config: {
                    tiers: {
                        basic: { resumeLimit: 2, canEdit: true },
                        premium: { resumeLimit: 100, canEdit: true },
                        enterprise: { resumeLimit: 5000, canEdit: true },
                    },
                },
            },
            error: null,
            isLoading: false,
            mutate: mockMutate,
        });

        const { result } = renderHook(() => useTierLimits());
        expect(result.current.limits.basic.resumeCreationLimit).toBe(2);
        expect(result.current.limits.basic.resumeEditingAllowed).toBe(true);
        expect(result.current.limits.premium.resumeCreationLimit).toBe(100);
    });

    it("handles loading and error states", () => {
        (useSWR as jest.Mock).mockReturnValue({
            data: null,
            error: new Error("Failed"),
            isLoading: true,
            mutate: mockMutate,
        });

        const { result } = renderHook(() => useTierLimits());
        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBe("Failed");
    });

    it("calls mutate when refetch is triggered", async () => {
        const { result } = renderHook(() => useTierLimits());
        await act(async () => {
            await result.current.refetch();
        });
        expect(mockMutate).toHaveBeenCalled();
    });
});
