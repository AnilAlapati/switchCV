import {
  applyCreativePolish,
  type CreativeStyle,
} from "@/lib/services/resumeCreativePolisher";

describe("resumeCreativePolisher", () => {
  it("polishes summary and experience statements while preserving numeric claims", () => {
    const input = {
      summary:
        "I improved API latency by 35% and reduced cloud spend by $120,000.",
      experience: [
        {
          company: "Acme",
          title: "Senior Engineer",
          description:
            "I was responsible for platform migrations and worked on reliability initiatives.",
          achievements: ["I improved incident response by 40%."],
        },
      ],
    };

    const result = applyCreativePolish(input, "professional");
    const summary = result.polishedData.summary as string;
    const experience = result.polishedData.experience as Array<{
      description: string;
      achievements: string[];
    }>;

    expect(summary).toContain("35%");
    expect(summary).toContain("$120,000");
    expect(summary.startsWith("Improved")).toBe(true);
    expect(experience[0].description).toContain("Led platform migrations");
    expect(experience[0].achievements[0]).toContain("40%");
    expect(result.appliedCount).toBeGreaterThan(0);
  });

  it("reverts low-confidence statements when numeric fidelity is not preserved", () => {
    const input = {
      summary: "I increased conversion by 22%.",
    };

    // Pick a style; numeric values should always be preserved due confidence checks.
    const result = applyCreativePolish(input, "innovator");
    const summary = result.polishedData.summary as string;

    expect(summary).toContain("22%");
    expect(
      result.annotations.every(
        (annotation) =>
          annotation.applied || annotation.reason === "low-confidence-reverted",
      ),
    ).toBe(true);
  });

  it.each<CreativeStyle>(["professional", "executive", "innovator"])(
    "supports style profile: %s",
    (style) => {
      const result = applyCreativePolish(
        {
          summary: "I worked on backend systems.",
        },
        style,
      );

      expect(typeof result.polishedData.summary).toBe("string");
      expect(result.annotations.length).toBeGreaterThan(0);
    },
  );
});
