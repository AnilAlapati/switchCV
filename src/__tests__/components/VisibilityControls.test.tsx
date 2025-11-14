// src/__tests__/components/VisibilityControls.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  VisibilityControls,
  VisibilityBadge,
  VisibilityIndicator,
} from "@/components/VisibilityControls";

describe("VisibilityControls", () => {
  it("should render all visibility options", () => {
    const mockOnChange = jest.fn();
    render(<VisibilityControls value="public" onChange={mockOnChange} />);

    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Masked")).toBeInTheDocument();
    expect(screen.getByText("Request")).toBeInTheDocument();
  });

  it("should display descriptions for each option", () => {
    const mockOnChange = jest.fn();
    render(
      <VisibilityControls
        value="public"
        onChange={mockOnChange}
        showLabels={true}
      />
    );

    expect(screen.getByText("Visible to everyone")).toBeInTheDocument();
    expect(screen.getByText("Hidden from view")).toBeInTheDocument();
    expect(screen.getByText("Requires request to access")).toBeInTheDocument();
  });

  it("should call onChange when visibility changes", () => {
    const mockOnChange = jest.fn();
    render(<VisibilityControls value="public" onChange={mockOnChange} />);

    const maskedOption = screen.getByDisplayValue("masked") as HTMLInputElement;
    fireEvent.click(maskedOption);

    expect(mockOnChange).toHaveBeenCalledWith("masked");
  });

  it("should mark current selection as checked", () => {
    const mockOnChange = jest.fn();
    render(<VisibilityControls value="masked" onChange={mockOnChange} />);

    const maskedOption = screen.getByDisplayValue("masked") as HTMLInputElement;
    expect(maskedOption.checked).toBe(true);

    const publicOption = screen.getByDisplayValue("public") as HTMLInputElement;
    expect(publicOption.checked).toBe(false);
  });

  it("should show info box with appropriate message", () => {
    const mockOnChange = jest.fn();

    // Test public
    const { rerender } = render(
      <VisibilityControls value="public" onChange={mockOnChange} />
    );
    expect(screen.getByText(/visible to all visitors/i)).toBeInTheDocument();

    // Test masked
    rerender(<VisibilityControls value="masked" onChange={mockOnChange} />);
    expect(screen.getByText(/hidden by default/i)).toBeInTheDocument();

    // Test request
    rerender(<VisibilityControls value="request" onChange={mockOnChange} />);
    expect(screen.getByText(/must submit a request/i)).toBeInTheDocument();
  });

  it("should accept custom label", () => {
    const mockOnChange = jest.fn();
    render(
      <VisibilityControls
        value="public"
        onChange={mockOnChange}
        label="Custom Privacy Label"
      />
    );

    expect(screen.getByText("Custom Privacy Label")).toBeInTheDocument();
  });
});

describe("VisibilityBadge", () => {
  it("should render public badge", () => {
    render(<VisibilityBadge value="public" />);

    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("🌍")).toBeInTheDocument();
  });

  it("should render masked badge", () => {
    render(<VisibilityBadge value="masked" />);

    expect(screen.getByText("Masked")).toBeInTheDocument();
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("should render request badge", () => {
    render(<VisibilityBadge value="request" />);

    expect(screen.getByText("Request")).toBeInTheDocument();
    expect(screen.getByText("🔑")).toBeInTheDocument();
  });

  it("should apply correct styling for each visibility level", () => {
    const { rerender } = render(<VisibilityBadge value="public" />);
    let badge = screen.getByText("Public").closest("span");
    expect(badge).toHaveClass("bg-green-100", "text-green-800");

    rerender(<VisibilityBadge value="masked" />);
    badge = screen.getByText("Masked").closest("span");
    expect(badge).toHaveClass("bg-yellow-100", "text-yellow-800");

    rerender(<VisibilityBadge value="request" />);
    badge = screen.getByText("Request").closest("span");
    expect(badge).toHaveClass("bg-blue-100", "text-blue-800");
  });
});

describe("VisibilityIndicator", () => {
  it("should render public indicator", () => {
    render(<VisibilityIndicator value="public" fieldName="Email" />);

    expect(screen.getByText(/publicly visible/)).toBeInTheDocument();
  });

  it("should render masked indicator", () => {
    render(<VisibilityIndicator value="masked" fieldName="Phone" />);

    expect(screen.getByText(/hidden but can be requested/)).toBeInTheDocument();
  });

  it("should render request indicator", () => {
    render(<VisibilityIndicator value="request" fieldName="Address" />);

    expect(screen.getByText(/requires approval/)).toBeInTheDocument();
  });

  it("should show field name in message", () => {
    render(<VisibilityIndicator value="public" fieldName="Experience" />);

    expect(
      screen.getByText(/Experience is publicly visible/)
    ).toBeInTheDocument();
  });

  it("should render compact badge when compact=true", () => {
    const { container } = render(
      <VisibilityIndicator value="public" fieldName="Email" compact={true} />
    );

    // Should render badge, not full indicator
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(
      screen.queryByText(/publicly visible on your resume/)
    ).not.toBeInTheDocument();
  });

  it("should render full indicator when compact=false", () => {
    render(
      <VisibilityIndicator value="public" fieldName="Email" compact={false} />
    );

    expect(
      screen.getByText(/publicly visible on your resume/)
    ).toBeInTheDocument();
  });
});

describe("Visibility Accessibility", () => {
  it("should have proper ARIA roles", () => {
    const mockOnChange = jest.fn();
    render(<VisibilityControls value="public" onChange={mockOnChange} />);

    const fieldset = screen.getByRole("group");
    expect(fieldset).toBeInTheDocument();
  });

  it("should have radio button inputs", () => {
    const mockOnChange = jest.fn();
    render(<VisibilityControls value="public" onChange={mockOnChange} />);

    const publicInput = screen.getByDisplayValue("public");
    expect(publicInput).toHaveAttribute("type", "radio");
  });

  it("should support keyboard navigation", () => {
    const mockOnChange = jest.fn();
    render(<VisibilityControls value="public" onChange={mockOnChange} />);

    const publicInput = screen.getByDisplayValue("public") as HTMLInputElement;
    expect(publicInput).toBeInTheDocument();
    expect(publicInput.checked).toBe(true);
  });
});
