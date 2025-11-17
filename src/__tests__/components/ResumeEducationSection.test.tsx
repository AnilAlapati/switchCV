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
      <ResumeEducationSection education={education as any} />
    );

    expect(getByText("B.Sc Computer Science")).toBeInTheDocument();
    expect(getByText("Test University")).toBeInTheDocument();
    expect(getByText("2018 – 2022")).toBeInTheDocument();
  });

  it("shows request notice when entries require access", () => {
    const education = [{ ...makeEdu({ visibility: "request" }) }];
    const { getByText } = render(
      <ResumeEducationSection education={education as any} />
    );

    expect(getByText(/require access approval/i)).toBeInTheDocument();
  });
});
