import React from "react";
import { render, screen, fireEvent } from "../__support__/testUtils";
import TemplateGallery from "@/components/resume/TemplateGallery";
import * as creativeTemplates from "@/lib/features/creativeTemplates";

// Mock creativeTemplates module
jest.mock("@/lib/features/creativeTemplates", () => ({
  __esModule: true,
  CREATIVE_TEMPLATES_ENABLED: true,
  TEMPLATE_TIERS: {
    "standard-v1": "free",
    "bento-v1": "premium",
    "editorial-v1": "enterprise",
  },
  canAccessTemplate: jest.fn(),
  getUpgradeMessage: jest.fn(),
  PREMIUM_TEMPLATE_INFO: {
    "bento-v1": {
      tagline: "Apple-style grid",
      bestFor: ["Designers", "Developers"],
    },
  },
}));

describe("TemplateGallery", () => {
  const mockOnSelectTemplate = jest.fn();
  const mockOnUpgrade = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (creativeTemplates.canAccessTemplate as jest.Mock).mockImplementation(
      (id, tier) => {
        if (id === "standard-v1") return true;
        if (id === "bento-v1" && (tier === "premium" || tier === "enterprise"))
          return true;
        if (id === "editorial-v1" && tier === "enterprise") return true;
        return false;
      },
    );
    (creativeTemplates.getUpgradeMessage as jest.Mock).mockImplementation(
      (id) => {
        if (id === "bento-v1")
          return { message: "Upgrade to Premium", tier: "premium" };
        if (id === "editorial-v1")
          return { message: "Upgrade to Enterprise", tier: "enterprise" };
        return null;
      },
    );
  });

  it("renders all template categories when creative templates are enabled", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    expect(screen.getByText("Standard Professional")).toBeInTheDocument();
    expect(screen.getByText("Bento")).toBeInTheDocument();
  });

  it("calls onSelectTemplate when an accessible template is clicked", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    fireEvent.click(screen.getByText("Standard Professional"));
    expect(mockOnSelectTemplate).toHaveBeenCalledWith("standard-v1");
  });

  it("does not call onSelectTemplate when an inaccessible template is clicked", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    fireEvent.click(screen.getByText("Bento").closest(".group")!);
    expect(mockOnSelectTemplate).not.toHaveBeenCalled();
  });

  it("shows lock overlay and upgrade message for inaccessible templates", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
        onUpgrade={mockOnUpgrade}
      />,
    );
    expect(screen.getByText("Upgrade to Premium")).toBeInTheDocument();
  });

  it("calls onUpgrade when upgrade button in lock overlay is clicked", () => {
    render(
      <TemplateGallery
        userTier="basic"
        onSelectTemplate={mockOnSelectTemplate}
        onUpgrade={mockOnUpgrade}
      />,
    );
    fireEvent.click(screen.getAllByText("Upgrade Now")[0]);
    expect(mockOnUpgrade).toHaveBeenCalledWith("premium");
  });

  it("renders premium tagline if provided in PREMIUM_TEMPLATE_INFO", () => {
    render(
      <TemplateGallery
        userTier="premium"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    expect(screen.getByText("Apple-style grid")).toBeInTheDocument();
  });

  it("shows 'Best For' tags on hover", () => {
    render(
      <TemplateGallery
        userTier="premium"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    const bentoCard = screen.getByText("Bento").closest(".group")!;
    fireEvent.mouseEnter(bentoCard);
    expect(screen.getByText("Designers")).toBeInTheDocument();
    expect(screen.getByText("Developers")).toBeInTheDocument();
    fireEvent.mouseLeave(bentoCard);
    expect(screen.queryByText("Designers")).not.toBeInTheDocument();
  });

  it("renders tier badges correctly", () => {
    render(
      <TemplateGallery
        userTier="enterprise"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    expect(screen.getAllByText("Premium").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enterprise").length).toBeGreaterThan(0);
  });

  it("renders a checkmark for the currently selected template", () => {
    render(
      <TemplateGallery
        userTier="basic"
        currentTemplateId="standard-v1"
        onSelectTemplate={mockOnSelectTemplate}
      />,
    );
    const card = screen.getByText("Standard Professional").closest(".group");
    expect(card).toHaveClass("ring-2", "ring-indigo-500");
  });
});
