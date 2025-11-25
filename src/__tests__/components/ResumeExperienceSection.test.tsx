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
      <ResumeExperienceSection experience={experience as any} />
    );

    expect(getByText("Software Engineer")).toBeInTheDocument();
    expect(getByText("ACME")).toBeInTheDocument();
    expect(getByText("2020 – 2023")).toBeInTheDocument();
    expect(getByText("Built features")).toBeInTheDocument();
  });
});
