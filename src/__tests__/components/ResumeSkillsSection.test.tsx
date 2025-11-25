import React from "react";
import { render } from "../__support__/testUtils";
import { ResumeSkillsSection } from "../../components/resume/ResumeSkillsSection";

const makeSkill = (overrides = {}) => ({
  name: "React",
  level: "Advanced",
  visibility: "public",
  ...overrides,
});

describe("ResumeSkillsSection", () => {
  it("renders public skills and suggested skills", () => {
    const skills = [makeSkill()];
    const suggestions = ["TypeScript"];
    const { getByText } = render(
      <ResumeSkillsSection
        skills={skills as any}
        skillSuggestions={suggestions}
      />
    );

    expect(getByText("React")).toBeInTheDocument();
    expect(getByText("Advanced")).toBeInTheDocument();
    expect(getByText("TypeScript")).toBeInTheDocument();
  });
});
