import { renderHook, act } from "@testing-library/react";
import { useTier } from "@/hooks/useTier";
import { useUserProfile } from "@/hooks/useUserProfile";

// Mock useUserProfile
jest.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: jest.fn(),
}));

describe("useTier hook", () => {
    const mockMutate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useUserProfile as jest.Mock).mockReturnValue({
            tier: "basic",
            loading: false,
            error: null,
            mutate: mockMutate,
        });
    });

    it("identifies basic tier correctly", () => {
        const { result } = renderHook(() => useTier());
        expect(result.current.isBasic).toBe(true);
        expect(result.current.isPremiumOrHigher).toBe(false);
    });

    it("identifies premium tier correctly", () => {
        (useUserProfile as jest.Mock).mockReturnValue({
            tier: "premium",
            loading: false,
            error: null,
            mutate: mockMutate,
        });
        const { result } = renderHook(() => useTier());
        expect(result.current.isPremium).toBe(true);
        expect(result.current.isPremiumOrHigher).toBe(true);
    });

    it("identifies enterprise tier correctly", () => {
        (useUserProfile as jest.Mock).mockReturnValue({
            tier: "enterprise",
            loading: false,
            error: null,
            mutate: mockMutate,
        });
        const { result } = renderHook(() => useTier());
        expect(result.current.isEnterprise).toBe(true);
        expect(result.current.isPremiumOrHigher).toBe(true);
    });

    it("handles loading state", () => {
        (useUserProfile as jest.Mock).mockReturnValue({
            tier: "basic",
            loading: true,
            error: null,
            mutate: mockMutate,
        });
        const { result } = renderHook(() => useTier());
        expect(result.current.loading).toBe(true);
    });

    it("handles error state", () => {
        (useUserProfile as jest.Mock).mockReturnValue({
            tier: "basic",
            loading: false,
            error: new Error("Network error"),
            mutate: mockMutate,
        });
        const { result } = renderHook(() => useTier());
        expect(result.current.error).toBe("Network error");
    });

    it("calls mutate when refetch is called", async () => {
        const { result } = renderHook(() => useTier());
        await act(async () => {
            await result.current.refetch();
        });
        expect(mockMutate).toHaveBeenCalled();
    });
});
