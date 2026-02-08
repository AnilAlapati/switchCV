import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import SeedPage from "@/app/seed/page";
import { useAuth } from "@/hooks/useAuth";
import { addDoc } from "firebase/firestore";

let mockSeedingEnabled = true;

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

// Mock config with a dynamic getter
jest.mock("@/lib/config", () => ({
    get ENABLE_SEEDING_AND_DEBUG_LISTS() {
        return mockSeedingEnabled;
    },
}));

// Mock Firebase
jest.mock("firebase/firestore", () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    getFirestore: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
    db: {},
}));

describe("SeedPage", () => {
    const mockUser = {
        email: "test@example.com",
        uid: "test-uid",
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        mockSeedingEnabled = true;
        (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
        global.fetch = jest.fn();
        (addDoc as jest.Mock).mockResolvedValue({ id: "mock-doc-id" });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it("shows disabled message when seeding is not enabled", () => {
        mockSeedingEnabled = false;
        render(<SeedPage />);
        expect(screen.getByText("Testing Disabled")).toBeInTheDocument();
    });

    it("shows current user email if logged in", () => {
        render(<SeedPage />);
        expect(screen.getByText(/Current User: test@example.com/)).toBeInTheDocument();
    });

    it("shows 'Not logged in' if user is null", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: null });
        render(<SeedPage />);
        expect(screen.getByText(/Current User: Not logged in/)).toBeInTheDocument();
    });

    it("adds error log if generating without login", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: null });
        render(<SeedPage />);

        const button = screen.getByText("Generate 10 Resumes");
        expect(button).toBeDisabled();
    });

    it("successfully generates resumes in a loop", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ title: "Mock Resume", templateId: "standard" }),
        });

        render(<SeedPage />);

        const button = screen.getByText("Generate 10 Resumes");
        fireEvent.click(button);

        // Should show starting log
        expect(screen.getByText(/🚀 Starting generation/)).toBeInTheDocument();

        // The loop has a 1000ms delay. We need to advance timers.
        // For 10 professions, we need to advance multiple times.

        // Profession 1
        await act(async () => {
            jest.advanceTimersByTime(1100);
        });

        await waitFor(() => {
            expect(screen.getByText(/✅ Saved resume: mock-doc-id/)).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith("/api/seed/generate", expect.any(Object));
        expect(addDoc).toHaveBeenCalled();
    });

    it("handles fetch error during generation", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        render(<SeedPage />);

        fireEvent.click(screen.getByText("Generate 10 Resumes"));

        // Advance timer to trigger the catch block if needed (though it's after fetch)
        await act(async () => {
            jest.advanceTimersByTime(1100);
        });

        await waitFor(() => {
            expect(screen.getByText(/❌ Error with/)).toBeInTheDocument();
            expect(screen.getByText(/Generation failed/)).toBeInTheDocument();
        });
    });

    it("handles firestore error during generation", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ title: "Mock Resume" }),
        });
        (addDoc as jest.Mock).mockRejectedValue(new Error("Firestore Error"));

        render(<SeedPage />);

        fireEvent.click(screen.getByText("Generate 10 Resumes"));

        await act(async () => {
            jest.advanceTimersByTime(1100);
        });

        await waitFor(() => {
            expect(screen.getByText(/❌ Error with/)).toBeInTheDocument();
            expect(screen.getByText(/Firestore Error/)).toBeInTheDocument();
        });
    });
});
