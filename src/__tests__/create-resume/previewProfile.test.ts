import { mapSessionDataToPreviewProfile } from "@/app/create-resume/previewProfile";

describe("mapSessionDataToPreviewProfile", () => {
  // -----------------------------------------------------------------------
  // Empty / missing data
  // -----------------------------------------------------------------------
  describe("empty data", () => {
    it("returns safe defaults for an empty object", () => {
      const result = mapSessionDataToPreviewProfile({});
      expect(result.title).toBe("");
      expect(result.summary).toBe("");
      expect(result.skills).toEqual([]);
      expect(result.experience).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.projects).toEqual([]);
      expect(result.personalInfo?.name).toBe("");
      expect(result.contact?.email?.value).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // Extraction format (ResumeDataRequirements)
  // -----------------------------------------------------------------------
  describe("extraction format (ResumeDataRequirements)", () => {
    it("maps name, email, phone at top level", () => {
      const result = mapSessionDataToPreviewProfile({
        name: "John Doe",
        email: "john@example.com",
        phone: "+1-555-0199",
      });
      expect(result.personalInfo?.name).toBe("John Doe");
      expect(result.contact?.email?.value).toBe("john@example.com");
      expect(result.contact?.phone?.value).toBe("+1-555-0199");
      expect(result.title).toBe("John Doe's Resume");
    });

    it("maps skills as string array", () => {
      const result = mapSessionDataToPreviewProfile({
        skills: ["TypeScript", "React", "Node.js"],
      });
      expect(result.skills).toHaveLength(3);
      expect(result.skills![0].name).toBe("TypeScript");
      expect(result.skills![0].level).toBe("intermediate");
      expect(result.skills![0].visibility).toBe("public");
    });

    it("maps experience with title & duration", () => {
      const result = mapSessionDataToPreviewProfile({
        experience: [
          {
            title: "Senior Dev",
            company: "Acme Corp",
            duration: "Jan 2020 - Dec 2023",
            description: "Led frontend team",
            achievements: ["Shipped v2", "Reduced bundle size 40%"],
          },
        ],
      });
      expect(result.experience).toHaveLength(1);
      const exp = result.experience![0];
      expect(exp.role).toBe("Senior Dev");
      expect(exp.company).toBe("Acme Corp");
      expect(exp.startDate).toBe("Jan 2020");
      expect(exp.endDate).toBe("Dec 2023");
      expect(exp.description).toContain("Led frontend team");
      expect(exp.description).toContain("Shipped v2");
    });

    it("maps education with year", () => {
      const result = mapSessionDataToPreviewProfile({
        education: [
          {
            institution: "MIT",
            degree: "B.S. Computer Science",
            year: "2019",
          },
        ],
      });
      expect(result.education).toHaveLength(1);
      const edu = result.education![0];
      expect(edu.institution).toBe("MIT");
      expect(edu.degree).toBe("B.S. Computer Science");
      expect(edu.startDate).toBe("2019");
    });

    it("maps location and social links", () => {
      const result = mapSessionDataToPreviewProfile({
        name: "Jane",
        location: "San Francisco",
        github: "https://github.com/jane",
        linkedin: "https://linkedin.com/in/jane",
      });
      expect(result.personalInfo?.location).toBe("San Francisco");
      expect(result.personalInfo?.github).toBe("https://github.com/jane");
      expect(result.personalInfo?.linkedin).toBe(
        "https://linkedin.com/in/jane",
      );
    });
  });

  // -----------------------------------------------------------------------
  // AI structured output format (AIResumeResponse)
  // -----------------------------------------------------------------------
  describe("AI structured output format (AIResumeResponse)", () => {
    it("maps name from personalInfo", () => {
      const result = mapSessionDataToPreviewProfile({
        personalInfo: { name: "AI User" },
      });
      expect(result.personalInfo?.name).toBe("AI User");
      expect(result.title).toBe("AI User's Resume");
    });

    it("maps email from contact.email.value", () => {
      const result = mapSessionDataToPreviewProfile({
        contact: {
          email: { value: "ai@example.com", visibility: "public" },
          phone: { value: "+1-555-0100", visibility: "public" },
        },
      });
      expect(result.contact?.email?.value).toBe("ai@example.com");
      expect(result.contact?.phone?.value).toBe("+1-555-0100");
    });

    it("maps experience with role & startDate/endDate", () => {
      const result = mapSessionDataToPreviewProfile({
        experience: [
          {
            role: "Staff Engineer",
            company: "BigCo",
            startDate: "2021",
            endDate: "Present",
            description: "Platform architecture",
            visibility: "public",
          },
        ],
      });
      const exp = result.experience![0];
      expect(exp.role).toBe("Staff Engineer");
      expect(exp.startDate).toBe("2021");
      expect(exp.endDate).toBe("Present");
    });

    it("maps education with startDate instead of year", () => {
      const result = mapSessionDataToPreviewProfile({
        education: [
          {
            institution: "Stanford",
            degree: "M.S. AI",
            startDate: "2020",
            endDate: "2022",
            visibility: "public",
          },
        ],
      });
      const edu = result.education![0];
      expect(edu.institution).toBe("Stanford");
      expect(edu.startDate).toBe("2020");
      expect(edu.endDate).toBe("2022");
    });

    it("maps skills as object array with name/level", () => {
      const result = mapSessionDataToPreviewProfile({
        skills: [
          { name: "Python", level: "expert", visibility: "public" },
          { name: "SQL", level: "advanced", visibility: "public" },
        ],
      });
      expect(result.skills).toHaveLength(2);
      expect(result.skills![0].name).toBe("Python");
      expect(result.skills![0].level).toBe("expert");
      expect(result.skills![1].name).toBe("SQL");
    });

    it("maps projects from AI output", () => {
      const result = mapSessionDataToPreviewProfile({
        projects: [
          {
            name: "Open Source Tool",
            description: "A helpful CLI",
            visibility: "public",
          },
        ],
      });
      expect(result.projects).toHaveLength(1);
      expect(result.projects![0].name).toBe("Open Source Tool");
      expect(result.projects![0].description).toBe("A helpful CLI");
    });

    it("preserves AI-provided title over generated one", () => {
      const result = mapSessionDataToPreviewProfile({
        title: "Senior Engineer Resume",
        name: "Jane",
      });
      expect(result.title).toBe("Senior Engineer Resume");
    });
  });

  // -----------------------------------------------------------------------
  // Mixed / hybrid data (extraction + AI merge)
  // -----------------------------------------------------------------------
  describe("mixed data (both formats merged)", () => {
    it("prefers top-level name over personalInfo.name", () => {
      const result = mapSessionDataToPreviewProfile({
        name: "Top Level Name",
        personalInfo: { name: "Nested Name" },
      });
      expect(result.personalInfo?.name).toBe("Top Level Name");
    });

    it("falls back to personalInfo when top-level is empty", () => {
      const result = mapSessionDataToPreviewProfile({
        name: "",
        personalInfo: { name: "Fallback Name" },
      });
      expect(result.personalInfo?.name).toBe("Fallback Name");
    });

    it("prefers top-level email over nested", () => {
      const result = mapSessionDataToPreviewProfile({
        email: "top@example.com",
        contact: {
          email: { value: "nested@example.com", visibility: "public" },
        },
      });
      expect(result.personalInfo?.email).toBe("top@example.com");
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("handles null/undefined values gracefully", () => {
      const result = mapSessionDataToPreviewProfile({
        name: null,
        email: undefined,
        skills: null,
        experience: undefined,
      } as unknown as Record<string, unknown>);
      expect(result.personalInfo?.name).toBe("");
      expect(result.skills).toEqual([]);
      expect(result.experience).toEqual([]);
    });

    it("filters out empty skill names from object array", () => {
      const result = mapSessionDataToPreviewProfile({
        skills: [
          { name: "Valid", level: "beginner" },
          { name: "", level: "advanced" },
          { name: "  ", level: "expert" },
        ],
      });
      expect(result.skills).toHaveLength(1);
      expect(result.skills![0].name).toBe("Valid");
    });

    it("filters out empty skill strings", () => {
      const result = mapSessionDataToPreviewProfile({
        skills: ["TypeScript", "", "  ", "React"],
      });
      expect(result.skills).toHaveLength(2);
    });

    it("handles experience with neither duration nor startDate", () => {
      const result = mapSessionDataToPreviewProfile({
        experience: [
          {
            title: "Intern",
            company: "Startup",
            description: "Worked on stuff",
          },
        ],
      });
      const exp = result.experience![0];
      expect(exp.startDate).toBe("");
      expect(exp.endDate).toBeUndefined();
    });

    it("handles non-object entries in experience array", () => {
      const result = mapSessionDataToPreviewProfile({
        experience: ["not an object", null, 42],
      });
      expect(result.experience).toHaveLength(3);
      // Should produce safe defaults
      expect(result.experience![0].role).toBe("");
    });
  });
});
