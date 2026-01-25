import React from "react";
import { render } from "../__support__/testUtils";
import { ResumeEducationSection } from "../../components/resume/ResumeEducationSection";

const makeEdu = (overrides = {}) => ({
  degree: "B.Sc Computer Science",
  institution: "Test University",
  startDate: "2018",
  endDate: "2022",
  description: "Studied things",
  visibility: "public",
  ...overrides,
});

describe("ResumeEducationSection", () => {
  it("renders public education entries", () => {
    const education = [makeEdu()];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("B.Sc Computer Science")).toBeInTheDocument();
    expect(getByText("Test University")).toBeInTheDocument();
    expect(getByText("2018 – 2022")).toBeInTheDocument();
  });

  it("shows request notice when entries require access", () => {
    const education = [{ ...makeEdu({ visibility: "request" }) }];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText(/require access approval/i)).toBeInTheDocument();
  });

  it("returns null when no public education and no requests", () => {
    const education = [{ ...makeEdu({ visibility: "private" }) }];
    const { container } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders education with long degree description (>100 chars)", () => {
    const longDescription = "A".repeat(150); // > 100 characters
    const education = [makeEdu({ degree: longDescription })];
    const { getByText, queryByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("Education & Background")).toBeInTheDocument();
    expect(getByText(longDescription)).toBeInTheDocument();
    // Should not show institution or dates when degree is treated as description
    expect(queryByText("Test University")).not.toBeInTheDocument();
    expect(queryByText("2018 – 2022")).not.toBeInTheDocument();
  });

  it("renders education with description when degree is normal length", () => {
    const education = [
      makeEdu({
        description: "Advanced coursework in algorithms and data structures",
      }),
    ];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("B.Sc Computer Science")).toBeInTheDocument();
    expect(
      getByText("Advanced coursework in algorithms and data structures"),
    ).toBeInTheDocument();
  });

  it("renders education without institution", () => {
    const education = [makeEdu({ institution: undefined })];
    const { getByText, queryByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("B.Sc Computer Science")).toBeInTheDocument();
    expect(queryByText("Test University")).not.toBeInTheDocument();
  });

  it("renders education with present end date", () => {
    const education = [makeEdu({ endDate: undefined })];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("2018 – Present")).toBeInTheDocument();
  });

  it("renders multiple education entries", () => {
    const education = [
      makeEdu({ degree: "B.Sc Computer Science", institution: "University A" }),
      makeEdu({
        degree: "M.Sc Software Engineering",
        institution: "University B",
        startDate: "2022",
        endDate: "2024",
      }),
    ];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("B.Sc Computer Science")).toBeInTheDocument();
    expect(getByText("University A")).toBeInTheDocument();
    expect(getByText("M.Sc Software Engineering")).toBeInTheDocument();
    expect(getByText("University B")).toBeInTheDocument();
  });

  it("shows private message when no public entries but has requests", () => {
    const education = [
      { ...makeEdu({ visibility: "private" }) },
      { ...makeEdu({ visibility: "request" }) },
    ];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("Education history is kept private.")).toBeInTheDocument();
    expect(getByText(/require access approval/i)).toBeInTheDocument();
  });

  it("handles education entries without IDs", () => {
    const education = [{ ...makeEdu(), id: undefined }];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    expect(getByText("B.Sc Computer Science")).toBeInTheDocument();
  });

  it("renders education with masked visibility", () => {
    const education = [{ ...makeEdu({ visibility: "masked" }) }];
    const { container } = render(
      <ResumeEducationSection education={education as any} />,
    );

    // Masked entries should not be shown as public
    expect(container.firstChild).toBeNull();
  });

  it("handles empty education array", () => {
    const { container } = render(<ResumeEducationSection education={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("handles education with only description and no degree", () => {
    const education = [
      makeEdu({
        degree: undefined,
        description: "Self-taught programming skills",
      }),
    ];
    const { getByText, queryByText } = render(
      <ResumeEducationSection education={education as any} />,
    );

    // Should still render something, but degree would be undefined
    expect(getByText("Self-taught programming skills")).toBeInTheDocument();
  });
});
