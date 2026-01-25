import React from "react";
import { render, screen, fireEvent } from "../__support__/testUtils";
import { PrivacyMenu } from "@/components/resume/PrivacyMenu";

describe("PrivacyMenu", () => {
  const defaultProps = {
    isPublic: false,
    viewerIsOwner: true,
    isPublicPreview: false,
    showPrivacyMenu: false,
    isUpdating: false,
    onToggleMenu: jest.fn(),
    onToggleVisibility: jest.fn(),
  };

  it("renders the trigger button with 'Private' label when not public", () => {
    render(<PrivacyMenu {...defaultProps} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("renders the trigger button with 'Public' label when public", () => {
    render(<PrivacyMenu {...defaultProps} isPublic={true} />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("calls onToggleMenu when the trigger button is clicked", () => {
    render(<PrivacyMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Private/i }));
    expect(defaultProps.onToggleMenu).toHaveBeenCalledTimes(1);
  });

  it("does not show the dropdown menu when showPrivacyMenu is false", () => {
    render(<PrivacyMenu {...defaultProps} />);
    expect(screen.queryByText("Private Profile")).not.toBeInTheDocument();
  });

  it("shows the dropdown menu when showPrivacyMenu is true", () => {
    render(<PrivacyMenu {...defaultProps} showPrivacyMenu={true} />);
    expect(screen.getByText("Private Profile")).toBeInTheDocument();
    expect(screen.getByText("Only you can see")).toBeInTheDocument();
  });

  it("shows correct dropdown content when isPublic is true", () => {
    render(
      <PrivacyMenu {...defaultProps} showPrivacyMenu={true} isPublic={true} />,
    );
    expect(screen.getByText("Public Profile")).toBeInTheDocument();
    expect(screen.getByText("Visible to everyone")).toBeInTheDocument();
  });

  it("renders the visibility toggle when viewerIsOwner is true", () => {
    render(<PrivacyMenu {...defaultProps} showPrivacyMenu={true} />);
    const buttons = screen.getAllByRole("button");
    // One for trigger, one for toggle
    expect(buttons).toHaveLength(2);
  });

  it("calls onToggleVisibility when the toggle switch is clicked", () => {
    render(<PrivacyMenu {...defaultProps} showPrivacyMenu={true} />);
    const toggle = screen.getAllByRole("button")[1];
    fireEvent.click(toggle);
    expect(defaultProps.onToggleVisibility).toHaveBeenCalledTimes(1);
  });

  it("disables the toggle switch when isUpdating is true", () => {
    render(
      <PrivacyMenu
        {...defaultProps}
        showPrivacyMenu={true}
        isUpdating={true}
      />,
    );
    const toggle = screen.getAllByRole("button")[1];
    expect(toggle).toBeDisabled();
  });

  it("does not render the toggle switch when viewerIsOwner is false", () => {
    render(
      <PrivacyMenu
        {...defaultProps}
        showPrivacyMenu={true}
        viewerIsOwner={false}
      />,
    );
    const buttons = screen.getAllByRole("button");
    // Only the trigger button
    expect(buttons).toHaveLength(1);
    expect(
      screen.getByText("View-only mode. Only the owner can edit."),
    ).toBeInTheDocument();
  });

  it("shows public preview warning when isPublicPreview is true", () => {
    render(
      <PrivacyMenu
        {...defaultProps}
        showPrivacyMenu={true}
        isPublicPreview={true}
      />,
    );
    expect(screen.getByText("Public Preview:")).toBeInTheDocument();
    expect(
      screen.getByText(/Recruiters can search this resume/),
    ).toBeInTheDocument();
  });

  it("applies rotated class to arrow when showPrivacyMenu is true", () => {
    render(<PrivacyMenu {...defaultProps} showPrivacyMenu={true} />);
    const trigger = screen.getByRole("button", { name: /Private/i });
    const arrow = trigger.querySelector("svg.transition-transform");
    expect(arrow).toHaveClass("rotate-180");
  });

  it("applies emerald classes when isPublic is true", () => {
    render(<PrivacyMenu {...defaultProps} isPublic={true} />);
    const trigger = screen.getByRole("button", { name: /Public/i });
    expect(trigger).toHaveClass("bg-emerald-500/10", "text-emerald-400");
  });
});
