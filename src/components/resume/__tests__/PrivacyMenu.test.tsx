import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrivacyMenu } from "../PrivacyMenu";

describe("PrivacyMenu", () => {
  const defaultProps = {
    isPublic: true,
    publicViewMode: "snapshot" as const,
    viewerIsOwner: true,
    isPublicPreview: false,
    showPrivacyMenu: false,
    isUpdating: false,
    onToggleMenu: jest.fn(),
    onToggleVisibility: jest.fn(),
    onChangeViewMode: jest.fn(),
  };

  it("renders public status properly", () => {
    render(<PrivacyMenu {...defaultProps} />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("renders private status properly", () => {
    render(<PrivacyMenu {...defaultProps} isPublic={false} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("renders private menu content properly", () => {
    render(
      <PrivacyMenu {...defaultProps} isPublic={false} showPrivacyMenu={true} />,
    );
    expect(screen.getByText("Private Profile")).toBeInTheDocument();
    expect(screen.getByText("Only you can see")).toBeInTheDocument();
  });

  it("calls onToggleMenu when button clicked", () => {
    render(<PrivacyMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));
    expect(defaultProps.onToggleMenu).toHaveBeenCalled();
  });

  it("renders the menu when showPrivacyMenu is true", () => {
    render(<PrivacyMenu {...defaultProps} showPrivacyMenu={true} />);
    expect(screen.getByText("Public Profile")).toBeInTheDocument();
  });

  it("renders update visibility button if owner and menu open", () => {
    const onToggleVisibility = jest.fn();
    render(
      <PrivacyMenu
        {...defaultProps}
        showPrivacyMenu={true}
        viewerIsOwner={true}
        onToggleVisibility={onToggleVisibility}
      />,
    );
    const switchBtn = screen.getByRole("button", { name: "" }); // The switch button has no text
    fireEvent.click(switchBtn);
    expect(onToggleVisibility).toHaveBeenCalled();
  });

  it("shows public preview warning", () => {
    render(
      <PrivacyMenu
        {...defaultProps}
        showPrivacyMenu={true}
        isPublicPreview={true}
      />,
    );
    expect(screen.getByText(/Public Preview:/i)).toBeInTheDocument();
  });

  it("shows view-only mode for non-owners", () => {
    render(
      <PrivacyMenu
        {...defaultProps}
        showPrivacyMenu={true}
        viewerIsOwner={false}
      />,
    );
    expect(
      screen.getByText("View-only mode. Only the owner can edit."),
    ).toBeInTheDocument();
  });
});
