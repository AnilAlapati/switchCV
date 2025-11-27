// src/__tests__/components/AccessCards.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessRequest, AccessGrant } from "@/types/profileSearch";

// Mock components for testing
function MockAccessRequestCard({
  request,
  onAction,
}: {
  request: AccessRequest;
  onAction: () => void;
}) {
  return (
    <div>
      <h3>{request.fromUserName}</h3>
      <p>{request.message || "Requested access to your resume"}</p>
      <button onClick={() => onAction()}>Approve</button>
      <button>Deny</button>
    </div>
  );
}

function MockActiveGrantCard({ grant }: { grant: AccessGrant }) {
  return (
    <div>
      <h3>Access Granted</h3>
      <p>Duration: {grant.duration?.label || "Forever"}</p>
      <button>Revoke Access</button>
    </div>
  );
}

function MockDeniedRequestCard({ request }: { request: AccessRequest }) {
  return (
    <div>
      <h3>{request.fromUserName}</h3>
      <p>You denied their access request</p>
    </div>
  );
}

describe("AccessRequestCard", () => {
  const mockRequest: AccessRequest = {
    requestId: "req1",
    fromUserId: "user456",
    fromUserName: "John Doe",
    timestamp: new Date(),
    message: "I'd like to collaborate",
    status: "pending",
  };

  test("renders request sender name", () => {
    render(
      <MockAccessRequestCard request={mockRequest} onAction={jest.fn()} />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  test("displays custom message when provided", () => {
    render(
      <MockAccessRequestCard request={mockRequest} onAction={jest.fn()} />
    );

    expect(screen.getByText("I'd like to collaborate")).toBeInTheDocument();
  });

  test("displays default message when no message provided", () => {
    const requestWithoutMessage = { ...mockRequest, message: undefined };

    render(
      <MockAccessRequestCard
        request={requestWithoutMessage}
        onAction={jest.fn()}
      />
    );

    expect(
      screen.getByText("Requested access to your resume")
    ).toBeInTheDocument();
  });

  test("has approve and deny buttons", () => {
    render(
      <MockAccessRequestCard request={mockRequest} onAction={jest.fn()} />
    );

    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Deny")).toBeInTheDocument();
  });

  test("calls onAction when approve is clicked", async () => {
    const onAction = jest.fn();
    render(<MockAccessRequestCard request={mockRequest} onAction={onAction} />);

    const approveButton = screen.getByText("Approve");
    await userEvent.click(approveButton);

    expect(onAction).toHaveBeenCalled();
  });
});

describe("ActiveGrantCard", () => {
  const mockGrant: AccessGrant = {
    grantId: "grant1",
    toUserId: "user456",
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    duration: {
      preset: "1_week",
      value: 1,
      unit: "week",
      durationHours: 168,
      durationMs: 604800000,
      label: "1 Week",
      isCustom: false,
    },
  };

  test("renders access granted header", () => {
    render(<MockActiveGrantCard grant={mockGrant} />);

    expect(screen.getByText("Access Granted")).toBeInTheDocument();
  });

  test("displays duration", () => {
    render(<MockActiveGrantCard grant={mockGrant} />);

    expect(screen.getByText("Duration: 1 Week")).toBeInTheDocument();
  });

  test("shows revoke button", () => {
    render(<MockActiveGrantCard grant={mockGrant} />);

    expect(screen.getByText("Revoke Access")).toBeInTheDocument();
  });

  test("handles forever duration grant", () => {
    const foreverGrant: AccessGrant = {
      ...mockGrant,
      duration: undefined,
      expiresAt: null,
    };

    render(<MockActiveGrantCard grant={foreverGrant} />);

    expect(screen.getByText("Duration: Forever")).toBeInTheDocument();
  });
});

describe("DeniedRequestCard", () => {
  const mockRequest: AccessRequest = {
    requestId: "req2",
    fromUserId: "user789",
    fromUserName: "Jane Smith",
    timestamp: new Date(),
    status: "denied",
  };

  test("renders denied request sender", () => {
    render(<MockDeniedRequestCard request={mockRequest} />);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  test("displays denied status message", () => {
    render(<MockDeniedRequestCard request={mockRequest} />);

    expect(
      screen.getByText("You denied their access request")
    ).toBeInTheDocument();
  });

  test("shows no action buttons", () => {
    render(<MockDeniedRequestCard request={mockRequest} />);

    expect(screen.queryByText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByText("Deny")).not.toBeInTheDocument();
  });
});
