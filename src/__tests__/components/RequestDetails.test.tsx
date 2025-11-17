import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import RequestDetails from "@/components/recruiter/RequestDetails";

describe("RequestDetails", () => {
  const mockRequest = {
    id: "req-1",
    request: {
      fromRecruiter: {
        name: "Jane",
        companyName: "Acme",
        email: "jane@acme.com",
      },
      toUserEmail: "candidate@example.com",
      resumeTitle: "Developer Resume",
      purpose: "Skill evaluation",
      requestedFields: ["email", "phone"],
      proposedDuration: "1 week",
      createdAt: new Date().toISOString(),
    },
  } as any;

  it("renders empty state when no request selected", () => {
    render(
      <RequestDetails
        selectedRequest={null}
        approveDuration="1week"
        denialReason=""
        processing={false}
        onApproveDurationChange={jest.fn()}
        onDenialReasonChange={jest.fn()}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />
    );
    expect(screen.getByText(/Select a request/)).toBeInTheDocument();
  });

  it("renders request details when selected", () => {
    render(
      <RequestDetails
        selectedRequest={mockRequest}
        approveDuration="1week"
        denialReason=""
        processing={false}
        onApproveDurationChange={jest.fn()}
        onDenialReasonChange={jest.fn()}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />
    );
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("candidate@example.com")).toBeInTheDocument();
  });

  it("calls onApprove when approve button is clicked", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();
    render(
      <RequestDetails
        selectedRequest={mockRequest}
        approveDuration="1week"
        denialReason=""
        processing={false}
        onApproveDurationChange={jest.fn()}
        onDenialReasonChange={jest.fn()}
        onApprove={handle}
        onDeny={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /Approve Request/ }));
    expect(handle).toHaveBeenCalled();
  });
});
