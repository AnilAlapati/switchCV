import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { RequestCard } from "@/components/recruiter/RequestCard";

describe("RequestCard", () => {
  const mockRequest = {
    toUserEmail: "candidate@example.com",
    resumeTitle: "Senior Dev Resume",
    createdAt: new Date().toISOString(),
    purpose: "Evaluate technical skills",
    proposedDuration: "30 days",
    requestedFields: ["email", "phone"],
    fromRecruiter: { name: "Jane", companyName: "Acme" },
  } as any;

  it("renders request info and status badge", () => {
    render(
      <RequestCard
        request={mockRequest}
        status="pending"
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText("candidate@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Senior Dev Resume/)).toBeInTheDocument();
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
  });

  it("calls onSelect when View Details is clicked", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();
    render(
      <RequestCard request={mockRequest} status="approved" onSelect={handle} />
    );
    await user.click(screen.getByRole("button", { name: /View Details/ }));
    expect(handle).toHaveBeenCalled();
  });
});
