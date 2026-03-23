import { mapSessionDataToPreviewProfile } from "./previewProfile";

describe("mapSessionDataToPreviewProfile", () => {
  it("normalizes default skill levels and experience dates for the live preview", () => {
    const profile = mapSessionDataToPreviewProfile({
      name: "Ada Lovelace",
      email: "ada@example.com",
      summary: "Mathematician and writer.",
      skills: ["TypeScript", "Prompt Design"],
      experience: [
        {
          title: "Staff Engineer",
          company: "SwitchCV",
          duration: "Jan 2024 - Present",
          description: "Built the live preview experience.",
          achievements: ["Reduced onboarding friction"],
        },
      ],
    });

    expect(profile.title).toBe("Ada Lovelace's Resume");
    expect(profile.skills).toEqual([
      {
        id: "TypeScript",
        name: "TypeScript",
        level: "intermediate",
        visibility: "public",
      },
      {
        id: "Prompt Design",
        name: "Prompt Design",
        level: "intermediate",
        visibility: "public",
      },
    ]);
    expect(profile.experience).toEqual([
      {
        id: "exp-0",
        company: "SwitchCV",
        role: "Staff Engineer",
        startDate: "Jan 2024",
        endDate: "Present",
        description:
          "Built the live preview experience.\nReduced onboarding friction",
        visibility: "public",
      },
    ]);
  });
});
