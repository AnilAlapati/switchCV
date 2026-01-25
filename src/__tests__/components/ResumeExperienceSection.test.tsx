import React from "react";
import { render } from "../__support__/testUtils";
import { ResumeExperienceSection } from "../../components/resume/ResumeExperienceSection";

const makeExp = (overrides = {}) => ({
  role: "Software Engineer",
  company: "ACME",
  startDate: "2020",
  endDate: "2023",
  description: "Built features",
  visibility: "public",
  ...overrides,
});

describe("ResumeExperienceSection", () => {
  it("renders public experience entries", () => {
    const experience = [makeExp()];
    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(getByText("Software Engineer")).toBeInTheDocument();
    expect(getByText("ACME")).toBeInTheDocument();
    expect(getByText("2020 – 2023")).toBeInTheDocument();
    expect(getByText("Built features")).toBeInTheDocument();
  });

  it("renders enhanced experience descriptions when provided", () => {
    const experience = [makeExp()];
    const enhancedExperience = {
      0: {
        enhancedDescription:
          "Enhanced: Built amazing features with cutting-edge technology",
      },
    };

    const { getByText, queryByText } = render(
      <ResumeExperienceSection
        experience={experience as any}
        enhancedExperience={enhancedExperience}
      />,
    );

    expect(
      getByText(
        "Enhanced: Built amazing features with cutting-edge technology",
      ),
    ).toBeInTheDocument();
    expect(queryByText("Built features")).not.toBeInTheDocument();
  });

  it("handles present date correctly", () => {
    const experience = [makeExp({ endDate: null })];
    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(getByText("2020 – Present")).toBeInTheDocument();
  });

  it("filters out non-public experience", () => {
    const experience = [
      makeExp({ visibility: "public" }),
      makeExp({ visibility: "private", role: "Secret Role" }),
      makeExp({ visibility: "request", role: "Request Role" }),
    ];

    const { getByText, queryByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(getByText("Software Engineer")).toBeInTheDocument();
    expect(queryByText("Secret Role")).not.toBeInTheDocument();
    expect(queryByText("Request Role")).not.toBeInTheDocument();
  });

  it("shows request access message when there are request items", () => {
    const experience = [
      makeExp({ visibility: "public" }),
      makeExp({ visibility: "request" }),
    ];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(
      getByText("Additional experience details are available upon request."),
    ).toBeInTheDocument();
  });

  it("shows masked items message when there are masked items", () => {
    const experience = [
      makeExp({ visibility: "public" }),
      makeExp({ visibility: "masked" }),
    ];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(
      getByText(
        "Some experience entries are hidden to protect sensitive work.",
      ),
    ).toBeInTheDocument();
  });

  it("shows protected message when no public experience but has request items", () => {
    const experience = [
      makeExp({ visibility: "request" }),
      makeExp({ visibility: "masked" }),
    ];

    const { getByText, queryByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(
      getByText("Experience entries are protected for privacy."),
    ).toBeInTheDocument();
    expect(queryByText("Software Engineer")).not.toBeInTheDocument();
  });

  it("returns null when no experience entries exist", () => {
    const { container } = render(<ResumeExperienceSection experience={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("returns null when all experience is private", () => {
    const experience = [
      makeExp({ visibility: "private" }),
      makeExp({ visibility: "private", role: "Another Role" }),
    ];

    const { container } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("handles empty enhanced experience gracefully", () => {
    const experience = [makeExp()];
    const enhancedExperience = {};

    const { getByText } = render(
      <ResumeExperienceSection
        experience={experience as any}
        enhancedExperience={enhancedExperience}
      />,
    );

    expect(getByText("Built features")).toBeInTheDocument();
  });

  it("handles partial enhanced experience", () => {
    const experience = [
      makeExp({ role: "Role 1" }),
      makeExp({ role: "Role 2" }),
    ];
    const enhancedExperience = {
      0: { enhancedDescription: "Enhanced Role 1" },
      // Role 2 not enhanced
    };

    const { getByText } = render(
      <ResumeExperienceSection
        experience={experience as any}
        enhancedExperience={enhancedExperience}
      />,
    );

    expect(getByText("Enhanced Role 1")).toBeInTheDocument();
    expect(getByText("Built features")).toBeInTheDocument(); // Original for role 2
  });

  it("renders multiple experience entries with different companies", () => {
    const experience = [
      makeExp({ company: "Company A", role: "Senior Engineer" }),
      makeExp({ company: "Company B", role: "Lead Engineer" }),
    ];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(getByText("Senior Engineer")).toBeInTheDocument();
    expect(getByText("Company A")).toBeInTheDocument();
    expect(getByText("Lead Engineer")).toBeInTheDocument();
    expect(getByText("Company B")).toBeInTheDocument();
  });

  it("handles experience with missing company", () => {
    const experience = [makeExp({ company: undefined })];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(getByText("Software Engineer")).toBeInTheDocument();
    // Should still render without crashing
  });

  it("handles experience with missing role", () => {
    const experience = [makeExp({ role: undefined })];

    const { container } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    // Should render the section but role might be empty
    expect(container.firstChild).not.toBeNull();
  });

  it("applies hover styles correctly", () => {
    const experience = [makeExp()];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    const roleElement = getByText("Software Engineer");
    expect(roleElement).toHaveClass("group-hover:text-blue-400");
  });

  it("shows both request and masked messages when both types exist", () => {
    const experience = [
      makeExp({ visibility: "public" }),
      makeExp({ visibility: "request" }),
      makeExp({ visibility: "masked" }),
    ];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(
      getByText("Additional experience details are available upon request."),
    ).toBeInTheDocument();
    expect(
      getByText(
        "Some experience entries are hidden to protect sensitive work.",
      ),
    ).toBeInTheDocument();
  });

  it("handles experience with special characters in descriptions", () => {
    const experience = [
      makeExp({
        description:
          "Built features with React & TypeScript, using AWS & Docker 🚀",
      }),
    ];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(
      getByText(
        "Built features with React & TypeScript, using AWS & Docker 🚀",
      ),
    ).toBeInTheDocument();
  });

  it("handles very long descriptions", () => {
    const longDescription = "A".repeat(1000);
    const experience = [makeExp({ description: longDescription })];

    const { getByText } = render(
      <ResumeExperienceSection experience={experience as any} />,
    );

    expect(getByText(longDescription)).toBeInTheDocument();
  });
});
