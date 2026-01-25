import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EditResumePage from "@/app/resumes/[id]/edit/page";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProfileForm } from "@/hooks/useProfileForm";

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useParams: jest.fn(),
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: jest.fn(),
}));

jest.mock("@/hooks/useProfileForm", () => ({
    useProfileForm: jest.fn(),
}));

// Mock components
jest.mock("@/components/resume/ResumeEditWizard", () => ({
    ResumeEditWizard: ({ onSave, onNext, onPrevious, onStepChange }: any) => (
        <div data-testid="resume-edit-wizard">
            <button data-testid="save-btn" onClick={onSave}>Save</button>
            <button data-testid="next-btn" onClick={onNext}>Next</button>
            <button data-testid="prev-btn" onClick={onPrevious}>Prev</button>
            <button data-testid="step-btn" onClick={() => onStepChange(2)}>Step 2</button>
        </div>
    ),
}));

// Mock internal lib
jest.mock("@/lib/utils/resumeEditor", () => ({
    normalizeResumeForEditor: jest.fn((data) => ({
        resume: data,
        meta: { version: 1 },
        profile: data.profile || {}
    })),
    mergeProfileIntoResume: jest.fn((base, profile) => ({ ...base, ...profile })),
}));

describe("EditResumePage", () => {
    const mockRouter = {
        replace: jest.fn(),
        push: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue({ id: "42" });
        (useSearchParams as jest.Mock).mockReturnValue({ get: (key: string) => (key === "mode" ? "manual" : null) });
        (useUserProfile as jest.Mock).mockReturnValue({ tier: "premium", loading: false });
        (useAuth as jest.Mock).mockReturnValue({
            user: { getIdToken: jest.fn().mockResolvedValue("token") },
            loading: false,
            needsEmailVerification: false
        });
        (useProfileForm as jest.Mock).mockReturnValue({
            profile: { title: "Test" },
            updateProfile: jest.fn(),
            experience: [],
            education: [],
            skills: [],
            projects: []
        });

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ id: "42", profile: { title: "Test" } })
        });
    });

    it("redirects to dashboard if user is basic tier", () => {
        (useUserProfile as jest.Mock).mockReturnValue({ tier: "basic", loading: false });
        render(<EditResumePage />);
        expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to ai-edit if mode is not manual", () => {
        (useSearchParams as jest.Mock).mockReturnValue({ get: () => "ai" });
        render(<EditResumePage />);
        expect(mockRouter.replace).toHaveBeenCalledWith("/resumes/42/ai-edit");
    });

    it("renders manual editor when mode is manual and tier is premium", async () => {
        render(<EditResumePage />);
        await waitFor(() => {
            expect(screen.getByTestId("resume-edit-wizard")).toBeInTheDocument();
        });
    });

    it("shows loading state while fetching resume", () => {
        // Note: ManualResumeEditor renders after auth and tier loading are finished.
        // To show "Loading resume editor...", we can make the internal fetchState "loading"
        // by not resolving the promise immediately.
        let resolveFetch: any;
        const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });
        global.fetch = jest.fn().mockReturnValue(fetchPromise);

        render(<EditResumePage />);
        expect(screen.getByText("Loading resume editor...")).toBeInTheDocument();
    });

    it("handles fetch error correctly", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: jest.fn().mockResolvedValue({ error: "Failed to load" })
        });

        render(<EditResumePage />);

        await waitFor(() => {
            expect(screen.getByText("Unable to load resume")).toBeInTheDocument();
            expect(screen.getByText("Failed to load")).toBeInTheDocument();
            fireEvent.click(screen.getByText("Return to Dashboard"));
            expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("redirects to verification if user is not authenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: null,
            loading: false,
            needsEmailVerification: false
        });
        render(<EditResumePage />);
        expect(mockRouter.replace).toHaveBeenCalled();
    });

    it("successfully saves changes", async () => {
        render(<EditResumePage />);

        // Wait for load
        await waitFor(() => expect(screen.getByTestId("resume-edit-wizard")).toBeInTheDocument());

        const saveBtn = screen.getByTestId("save-btn");
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/resumes/42", expect.objectContaining({
                method: "PUT"
            }));
        });
    });

    it("handles save error correctly", async () => {
        render(<EditResumePage />);
        await waitFor(() => expect(screen.getByTestId("resume-edit-wizard")).toBeInTheDocument());

        // Mock subsequent save failure
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: jest.fn().mockResolvedValue({ error: "Save Failed" })
        });

        fireEvent.click(screen.getByTestId("save-btn"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/resumes/42", expect.objectContaining({
                method: "PUT"
            }));
        });
    });

    it("supports navigation via wizard buttons", async () => {
        render(<EditResumePage />);
        await waitFor(() => expect(screen.getByTestId("resume-edit-wizard")).toBeInTheDocument());

        fireEvent.click(screen.getByTestId("next-btn"));
        fireEvent.click(screen.getByTestId("prev-btn"));
        fireEvent.click(screen.getByTestId("step-btn"));
    });
});
