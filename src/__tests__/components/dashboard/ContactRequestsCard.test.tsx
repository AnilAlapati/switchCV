import { render, screen, waitFor } from "@testing-library/react";
import { ContactRequestsCard } from "@/components/dashboard/ContactRequestsCard";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/context/DashboardMetricsContext", () => ({
    useOptionalDashboardMetricsContext: jest.fn(),
}));

jest.mock("@/lib/logger");

describe("ContactRequestsCard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useAuth as jest.Mock).mockReturnValue({ user: { uid: "user-123" } });
        (useOptionalDashboardMetricsContext as jest.Mock).mockReturnValue(null);
        global.fetch = jest.fn();
    });

    it("renders with metrics from context when available", () => {
        (useOptionalDashboardMetricsContext as jest.Mock).mockReturnValue({
            jobSeekerMetrics: { contactRequests: 5 },
            loading: false,
        });

        render(<ContactRequestsCard />);

        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("5 contact requests")).toBeInTheDocument();
    });

    it("renders with metrics from fetch when context is not available", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ contactRequests: 3 }),
        });

        render(<ContactRequestsCard />);

        expect(screen.getByText("-")).toBeInTheDocument(); // Initial loading state

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument();
            expect(screen.getByText("3 contact requests")).toBeInTheDocument();
        });
    });

    it("shows loading state when context is loading", () => {
        (useOptionalDashboardMetricsContext as jest.Mock).mockReturnValue({
            jobSeekerMetrics: null,
            loading: true,
        });

        render(<ContactRequestsCard />);

        expect(screen.getByText("-")).toBeInTheDocument();
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("handles zero requests correctly", () => {
        (useOptionalDashboardMetricsContext as jest.Mock).mockReturnValue({
            jobSeekerMetrics: { contactRequests: 0 },
            loading: false,
        });

        render(<ContactRequestsCard />);

        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No requests yet")).toBeInTheDocument();
    });

    it("handles single request correctly (singular text)", () => {
        (useOptionalDashboardMetricsContext as jest.Mock).mockReturnValue({
            jobSeekerMetrics: { contactRequests: 1 },
            loading: false,
        });

        render(<ContactRequestsCard />);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("1 contact request")).toBeInTheDocument();
    });
});
