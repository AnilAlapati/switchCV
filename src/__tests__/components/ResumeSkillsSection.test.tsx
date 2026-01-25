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
      />,
    );

    expect(getByText("React")).toBeInTheDocument();
    expect(getByText("Advanced")).toBeInTheDocument();
    expect(getByText("TypeScript")).toBeInTheDocument();
  });

  it("returns null when no public skills", () => {
    const skills = [{ ...makeSkill({ visibility: "private" }) }];
    const { container } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders multiple public skills", () => {
    const skills = [
      makeSkill({ name: "React", level: "Advanced" }),
      makeSkill({ name: "TypeScript", level: "Intermediate" }),
      makeSkill({ name: "Node.js", level: "Expert" }),
    ];
    const { getByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(getByText("React")).toBeInTheDocument();
    expect(getByText("Advanced")).toBeInTheDocument();
    expect(getByText("TypeScript")).toBeInTheDocument();
    expect(getByText("Intermediate")).toBeInTheDocument();
    expect(getByText("Node.js")).toBeInTheDocument();
    expect(getByText("Expert")).toBeInTheDocument();
  });

  it("shows protected notice when there are masked skills", () => {
    const skills = [makeSkill(), { ...makeSkill({ visibility: "masked" }) }];
    const { getByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(getByText("+More (Protected)")).toBeInTheDocument();
  });

  it("shows protected notice when there are request skills", () => {
    const skills = [makeSkill(), { ...makeSkill({ visibility: "request" }) }];
    const { getByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(getByText("+More (Protected)")).toBeInTheDocument();
  });

  it("renders skills without IDs", () => {
    const skills = [{ ...makeSkill(), id: undefined }];
    const { getByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(getByText("React")).toBeInTheDocument();
  });

  it("renders suggested skills section when provided", () => {
    const skills = [makeSkill()];
    const suggestions = ["Vue.js", "Angular", "Svelte"];
    const { getByText } = render(
      <ResumeSkillsSection
        skills={skills as any}
        skillSuggestions={suggestions}
      />,
    );

    expect(getByText("Suggested Skills")).toBeInTheDocument();
    expect(getByText("Vue.js")).toBeInTheDocument();
    expect(getByText("Angular")).toBeInTheDocument();
    expect(getByText("Svelte")).toBeInTheDocument();
  });

  it("does not render suggested skills section when empty array", () => {
    const skills = [makeSkill()];
    const suggestions: string[] = [];
    const { queryByText } = render(
      <ResumeSkillsSection
        skills={skills as any}
        skillSuggestions={suggestions}
      />,
    );

    expect(queryByText("Suggested Skills")).not.toBeInTheDocument();
  });

  it("does not render suggested skills section when undefined", () => {
    const skills = [makeSkill()];
    const { queryByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(queryByText("Suggested Skills")).not.toBeInTheDocument();
  });

  it("handles empty skills array", () => {
    const { container } = render(<ResumeSkillsSection skills={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders skills with different levels", () => {
    const skills = [
      makeSkill({ name: "Beginner Skill", level: "Beginner" }),
      makeSkill({ name: "Intermediate Skill", level: "Intermediate" }),
      makeSkill({ name: "Advanced Skill", level: "Advanced" }),
      makeSkill({ name: "Expert Skill", level: "Expert" }),
    ];
    const { getByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    expect(getByText("Beginner")).toBeInTheDocument();
    expect(getByText("Intermediate")).toBeInTheDocument();
    expect(getByText("Advanced")).toBeInTheDocument();
    expect(getByText("Expert")).toBeInTheDocument();
  });

  it("handles skills with empty or undefined level", () => {
    const skills = [makeSkill({ level: undefined }), makeSkill({ level: "" })];
    const { getAllByText } = render(
      <ResumeSkillsSection skills={skills as any} />,
    );

    // Should still render the skill names
    expect(getAllByText("React")).toHaveLength(2);
  });
});
