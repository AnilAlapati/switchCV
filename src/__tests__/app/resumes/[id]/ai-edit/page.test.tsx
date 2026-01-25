import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ResumeAIEditPage from "@/app/resumes/[id]/ai-edit/page";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useParams: jest.fn(),
    useRouter: jest.fn(),
}));

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: jest.fn(),
}));

// Mock components
jest.mock("@/components/resume/ResumeEditChatHeader", () => ({
    ResumeEditChatHeader: () => <div data-testid="chat-header" />,
}));
jest.mock("@/components/resume/ResumeEditChatInput", () => ({
    ResumeEditChatInput: ({ onSubmit, value, onChange }: any) => (
        <form data-testid="chat-form" onSubmit={(e) => { e.preventDefault(); onSubmit(e); }}>
            <input data-testid="chat-input" value={value} onChange={(e) => onChange(e.target.value)} />
            <button type="submit">Send</button>
        </form>
    ),
}));
jest.mock("@/components/resume/ResumeEditChatStatus", () => ({
    ResumeEditChatStatus: ({ errorMessage }: any) => <div data-testid="chat-status">{errorMessage}</div>,
}));
jest.mock("@/components/resume/ResumeEditMessageList", () => ({
    ResumeEditMessageList: ({ messages }: any) => (
        <div data-testid="message-list">
            {messages.map((m: any) => <div key={m.id}>{m.content}</div>)}
        </div>
    ),
}));
jest.mock("@/components/resume/ResumeSnapshotCard", () => ({
    ResumeSnapshotCard: () => <div data-testid="snapshot-card" />,
}));
jest.mock("@/components/ui/BackgroundBlobs", () => ({
    BackgroundBlobs: () => <div data-testid="blobs" />,
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("ResumeAIEditPage", () => {
    const mockRouter = {
        replace: jest.fn(),
        push: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useParams as jest.Mock).mockReturnValue({ id: "42" });
        (useUserProfile as jest.Mock).mockReturnValue({ tier: "premium", loading: false });
        (useAuth as jest.Mock).mockReturnValue({
            user: { getIdToken: jest.fn().mockResolvedValue("token") },
            loading: false,
            needsEmailVerification: false
        });

        global.fetch = jest.fn().mockImplementation((url) => {
            if (url === "/api/ai/status") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ connected: true, model: "gpt-4" })
                });
            }
            if (url.includes("/chat")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        resumeExists: true,
                        resume: { title: "Test Resume" },
                        greeting: "Hello, how can I help?"
                    })
                });
            }
            return Promise.reject(new Error("Unknown endpoint"));
        });
    });

    it("redirects to dashboard if user is basic tier", () => {
        (useUserProfile as jest.Mock).mockReturnValue({ tier: "basic", loading: false });
        render(<ResumeAIEditPage />);
        expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to verification if user is not authenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false, needsEmailVerification: false });
        render(<ResumeAIEditPage />);
        expect(mockRouter.push).toHaveBeenCalled();
    });

    it("loads and displays initial chat context", async () => {
        render(<ResumeAIEditPage />);

        await waitFor(() => {
            expect(screen.getByText("Hello, how can I help?")).toBeInTheDocument();
            expect(screen.getByTestId("snapshot-card")).toBeInTheDocument();
        });
    });

    it("handles missing resume case", async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url === "/api/ai/status") return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: true }) });
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ resumeExists: false })
            });
        });

        render(<ResumeAIEditPage />);

        await waitFor(() => {
            expect(screen.getByText("No resume on file yet")).toBeInTheDocument();
        });
    });

    it("handles fetch error for context", async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url === "/api/ai/status") return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: true }) });
            return Promise.resolve({ ok: false, status: 500 });
        });

        render(<ResumeAIEditPage />);

        await waitFor(() => {
            expect(screen.getByTestId("chat-status")).toHaveTextContent("Failed to load resume context: 500");
        });
    });

    it("submits user message and receives AI response", async () => {
        render(<ResumeAIEditPage />);

        await waitFor(() => expect(screen.getByText("Hello, how can I help?")).toBeInTheDocument());

        const input = screen.getByTestId("chat-input");
        fireEvent.change(input, { target: { value: "Update my summary" } });

        // Mock the POST request
        (global.fetch as jest.Mock).mockImplementation((url, init) => {
            if (url.includes("/chat") && init.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        response: "I've updated your summary.",
                        resume: { title: "Updated Title" }
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        fireEvent.submit(screen.getByTestId("chat-form"));

        await waitFor(() => {
            expect(screen.getByText("Update my summary")).toBeInTheDocument();
            expect(screen.getByText("I've updated your summary.")).toBeInTheDocument();
        });
    });

    it("handles submission error", async () => {
        render(<ResumeAIEditPage />);
        await waitFor(() => expect(screen.getByText("Hello, how can I help?")).toBeInTheDocument());

        (global.fetch as jest.Mock).mockImplementation((url, init) => {
            if (url.includes("/chat") && init.method === "POST") {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: "Failed to process message" })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        fireEvent.change(screen.getByTestId("chat-input"), { target: { value: "error test" } });
        fireEvent.submit(screen.getByTestId("chat-form"));

        await waitFor(() => {
            expect(screen.getByTestId("chat-status")).toHaveTextContent("Failed to process message");
        });
    });
});
