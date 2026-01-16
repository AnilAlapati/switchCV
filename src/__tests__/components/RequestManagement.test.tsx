import React from "react";
import { render, screen, waitFor } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { RequestManagement } from "@/components/recruiter/RequestManagement";

jest.mock("@/components/recruiter/RequestStats", () => ({
  RequestStats: () => <div data-testid="request-stats">Stats</div>,
}));

jest.mock("@/components/recruiter/RequestTabs", () => ({
  RequestTabs: ({ onTabChange }: { onTabChange: (tab: string) => void }) => (
    <div data-testid="request-tabs">
      <button onClick={() => onTabChange("pending")}>Pending</button>
      <button onClick={() => onTabChange("approved")}>Approved</button>
    </div>
  ),
}));

jest.mock("@/components/recruiter/RequestCard", () => ({
  RequestCard: ({ request, onSelect }: { request: { id: string; name: string }; onSelect: () => void }) => (
    <div data-testid="request-card" onClick={onSelect}>
      {request.id}
    </div>
  ),
}));

describe("RequestManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("renders stats and tabs on load", () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        requests: [],
        summary: { total: 0, pending: 0, approved: 0, denied: 0, expired: 0 },
      }),
    });

    render(<RequestManagement recruiterId="recruiter-1" />);

    expect(screen.getByTestId("request-stats")).toBeInTheDocument();
    expect(screen.getByTestId("request-tabs")).toBeInTheDocument();
  });

  it("shows loading spinner initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  requests: [],
                  summary: {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    denied: 0,
                    expired: 0,
                  },
                }),
              }),
            100
          );
        })
    );

    render(<RequestManagement recruiterId="recruiter-1" />);
    expect(screen.getByText("Loading requests...")).toBeInTheDocument();
  });

  it("displays error when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    render(<RequestManagement recruiterId="recruiter-1" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load requests")).toBeInTheDocument();
    });
  });

  it("calls onRequestSelect when card is clicked", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();
    const mockRequest = { id: "req-1", status: "pending" } as any;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        requests: [mockRequest],
        summary: { total: 1, pending: 1, approved: 0, denied: 0, expired: 0 },
      }),
    });

    render(
      <RequestManagement recruiterId="recruiter-1" onRequestSelect={handle} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("request-card")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("request-card"));
    expect(handle).toHaveBeenCalledWith(mockRequest);
  });
});
