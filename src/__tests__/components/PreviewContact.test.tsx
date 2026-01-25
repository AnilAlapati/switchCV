import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewContact } from "@/components/resume/PreviewContact";

// Mock the VisibilityBadge component
jest.mock("@/components/VisibilityControls", () => ({
  VisibilityBadge: ({ value }: { value: string }) => (
    <span data-testid={`visibility-badge-${value}`}>
      {value === "public"
        ? "🌍 Public"
        : value === "masked"
          ? "🔒 Masked"
          : "🔑 Request"}
    </span>
  ),
}));

describe("PreviewContact", () => {
  it("returns null when no contact information is provided", () => {
    const profile = {};
    const { container } = render(<PreviewContact profile={profile} />);

    expect(container.firstChild).toBeNull();
  });

  it("returns null when contact exists but no email or phone values", () => {
    const profile = {
      contact: {},
    };
    const { container } = render(<PreviewContact profile={profile} />);

    expect(container.firstChild).toBeNull();
  });

  it("displays email when email is provided", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "public" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-public")).toBeInTheDocument();
    expect(screen.getByText("📧")).toBeInTheDocument();
  });

  it("displays phone when phone is provided", () => {
    const profile = {
      contact: {
        phone: {
          value: "+1-555-0123",
          visibility: "masked" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    expect(screen.getByText("+1-555-0123")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-masked")).toBeInTheDocument();
    expect(screen.getByText("📱")).toBeInTheDocument();
  });

  it("displays both email and phone when both are provided", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "public" as const,
        },
        phone: {
          value: "+1-555-0123",
          visibility: "request" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1-555-0123")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-public")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-request")).toBeInTheDocument();
    expect(screen.getAllByText("📧")).toHaveLength(1);
    expect(screen.getAllByText("📱")).toHaveLength(1);
  });

  it("renders section with correct heading", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "public" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("📧 Contact");
  });

  it("applies correct CSS classes to section", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "public" as const,
        },
      },
    };

    const { container } = render(<PreviewContact profile={profile} />);

    const section = container.querySelector("section");
    expect(section).toHaveClass("border-t", "pt-6");

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveClass(
      "text-lg",
      "font-semibold",
      "text-gray-900",
      "mb-3",
      "flex",
      "items-center",
      "gap-2",
    );
  });

  it("applies correct CSS classes to contact items", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "public" as const,
        },
        phone: {
          value: "+1-555-0123",
          visibility: "masked" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    // Find contact item containers (exclude the heading)
    const contactContainers = screen
      .getAllByText(/^📧|📱/)
      .filter((element) =>
        element.closest('div[class*="flex items-center gap-2"]'),
      );
    expect(contactContainers).toHaveLength(2);

    // Check that each contact item has the correct container classes
    const emailContainer = screen.getByText("test@example.com").closest("div");
    expect(emailContainer).toHaveClass("flex", "items-center", "gap-2");

    const phoneContainer = screen.getByText("+1-555-0123").closest("div");
    expect(phoneContainer).toHaveClass("flex", "items-center", "gap-2");
  });

  it("handles different visibility values correctly", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "request" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    expect(screen.getByTestId("visibility-badge-request")).toBeInTheDocument();
  });

  it("handles empty email value gracefully", () => {
    const profile = {
      contact: {
        email: { value: "", visibility: "public" as const },
        phone: {
          value: "+1-555-0123",
          visibility: "public" as const,
        },
      },
    };

    render(<PreviewContact profile={profile} />);

    // Only phone should be displayed, email should be ignored
    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("+1-555-0123")).toBeInTheDocument();
    expect(screen.getByText("📱")).toBeInTheDocument();
    expect(screen.queryByText("📧")).not.toBeInTheDocument();
  });

  it("handles empty phone value gracefully", () => {
    const profile = {
      contact: {
        email: {
          value: "test@example.com",
          visibility: "public" as const,
        },
        phone: { value: "", visibility: "public" as const },
      },
    };

    render(<PreviewContact profile={profile} />);

    // Only email should be displayed, phone should be ignored
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.queryByText("+1-555-0123")).not.toBeInTheDocument();
    expect(screen.getByText("📧")).toBeInTheDocument();
    expect(screen.queryByText("📱")).not.toBeInTheDocument();
  });
});
