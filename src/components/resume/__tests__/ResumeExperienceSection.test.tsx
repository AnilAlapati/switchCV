import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeExperienceSection } from "../ResumeExperienceSection";
import * as visibilityUtils from "@/lib/utils/resumeVisibility";

jest.mock("@/lib/utils/resumeVisibility", () => ({
  hasRequestItems: jest.fn(),
  hasMaskedItems: jest.fn(),
}));

describe("ResumeExperienceSection", () => {
  const mockExperience = [
    {
      id: "1",
      role: "Software Engineer",
      company: "Tech Co",
      startDate: "2020",
      description: "Original description",
      visibility: "public",
    },
    {
      role: "NoID",
      company: "NoID Inc",
      startDate: "2019",
      visibility: "public",
    },
    {
      id: "2",
      role: "Manager",
      company: "Private Inc",
      startDate: "2018",
      description: "Private description",
      visibility: "request",
    },
  ];

  it("renders public experience", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(true);
    (visibilityUtils.hasMaskedItems as jest.Mock).mockReturnValue(false);

    render(<ResumeExperienceSection experience={mockExperience as any} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Tech Co")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Additional experience details are available upon request.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
  });

  it("prioritizes enhanced description", () => {
    const enhancedExperience = {
      "0": { enhancedDescription: "Enhanced description" },
    };
    render(
      <ResumeExperienceSection
        experience={mockExperience as any}
        enhancedExperience={enhancedExperience as any}
      />,
    );
    expect(screen.getByText("Enhanced description")).toBeInTheDocument();
    expect(screen.queryByText("Original description")).not.toBeInTheDocument();
  });

  it("handles only restricted experience", () => {
    const restrictedExp = [{ id: "1", role: "Secret", visibility: "request" }];
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(true);

    render(<ResumeExperienceSection experience={restrictedExp as any} />);
    expect(
      screen.getByText("Experience entries are protected for privacy."),
    ).toBeInTheDocument();
  });

  it("returns null if no public or request experience", () => {
    const { container } = render(<ResumeExperienceSection experience={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows masked message when masked items exist", () => {
    (visibilityUtils.hasMaskedItems as jest.Mock).mockReturnValue(true);
    render(<ResumeExperienceSection experience={mockExperience as any} />);
    expect(
      screen.getByText(/Some experience entries are hidden/),
    ).toBeInTheDocument();
  });
});
