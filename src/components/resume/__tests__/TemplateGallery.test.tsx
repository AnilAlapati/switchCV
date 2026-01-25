import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateGallery } from "../TemplateGallery";
import * as creativeTemplates from "@/lib/features/creativeTemplates";

// Mock the feature flag and utility functions
jest.mock("@/lib/features/creativeTemplates", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/features/creativeTemplates"),
}));

describe("TemplateGallery", () => {
  const mockOnSelectTemplate = jest.fn();
  const mockOnUpgrade = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to enabled
    (creativeTemplates as any).CREATIVE_TEMPLATES_ENABLED = true;
  });

  it("renders the gallery with all templates when enabled", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    expect(screen.getByText("Choose Your Template")).toBeInTheDocument();
    expect(screen.getByText("Standard Professional")).toBeInTheDocument();
    expect(screen.getByText("Bento")).toBeInTheDocument();
    expect(screen.getByText("Editorial")).toBeInTheDocument();
  });

  it("filters templates when CREATIVE_TEMPLATES_ENABLED is false", () => {
    // Force set the value
    Object.defineProperty(creativeTemplates, "CREATIVE_TEMPLATES_ENABLED", {
      value: false,
      configurable: true,
    });

    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    expect(screen.getByText("Standard Professional")).toBeInTheDocument();
    // Premium ones should be missing
    expect(screen.queryByText("Bento")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Premium templates are currently disabled/),
    ).toBeInTheDocument();
  });

  it("calls onSelectTemplate when a free template is clicked", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    fireEvent.click(screen.getByText("Standard Professional"));
    expect(mockOnSelectTemplate).toHaveBeenCalledWith("standard-v1");
  });

  it("shows lock overlay and calls onUpgrade for premium templates on basic tier", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
        onUpgrade={mockOnUpgrade}
      />,
    );

    // Should render Bento (because CREATIVE_TEMPLATES_ENABLED is true)
    const bentoCard = screen.getByText("Bento").closest(".group")!;

    // Simulate hover to see "best for" tags if any, but first check upgrade button
    const upgradeButton = screen.getAllByText("Upgrade Now")[0]; // First lock overlay button
    fireEvent.click(upgradeButton);

    expect(mockOnUpgrade).toHaveBeenCalled();
    expect(mockOnSelectTemplate).not.toHaveBeenCalled();
  });

  it("allows selecting premium templates for premium users", () => {
    render(
      <TemplateGallery
        userTier="premium"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    fireEvent.click(screen.getByText("Bento"));
    expect(mockOnSelectTemplate).toHaveBeenCalledWith("bento-v1");
  });

  it("highlights the currently selected template", () => {
    render(
      <TemplateGallery
        userTier="premium"
        currentTemplateId="bento-v1"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    const bentoCard = screen.getByText("Bento").closest(".group")!;
    expect(bentoCard).toHaveClass("ring-2");
    expect(bentoCard).toHaveClass("ring-indigo-500");
  });

  it("shows 'best for' tags on hover and handles mouse leave", () => {
    render(
      <TemplateGallery
        userTier="premium"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    const card = screen.getByText("Bento").closest(".group")!;
    fireEvent.mouseEnter(card);

    expect(screen.getByText("Product Managers")).toBeInTheDocument();

    fireEvent.mouseLeave(card);
    expect(screen.queryByText("Product Managers")).not.toBeInTheDocument();
  });

  it("does not call onSelectTemplate when an inaccessible template card is clicked", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    // Click the card itself (not the upgrade button)
    const bentoCard = screen.getByText("Bento").closest(".group")!;
    fireEvent.click(bentoCard);

    expect(mockOnSelectTemplate).not.toHaveBeenCalled();
  });

  it("renders correct badges for different tiers", () => {
    render(
      <TemplateGallery
        userTier="enterprise"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );

    expect(screen.getAllByText("Premium").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enterprise").length).toBeGreaterThan(0);
  });
});
