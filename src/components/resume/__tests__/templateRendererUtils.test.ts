import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
  normalizeCertifications,
  normalizeLanguages,
  normalizeAwards,
} from "@/components/resume/templateRendererUtils";

describe("templateRendererUtils", () => {
  describe("normalizeSkills", () => {
    it("returns empty array for falsy values", () => {
      expect(normalizeSkills(null)).toEqual([]);
      expect(normalizeSkills(undefined)).toEqual([]);
    });

    it("returns empty array for non-array values", () => {
      expect(normalizeSkills("skill")).toEqual([]);
    });

    it("handles array of strings", () => {
      expect(normalizeSkills(["React", "Node"])).toEqual(["React", "Node"]);
    });

    it("handles array of objects with name or label", () => {
      const skills = [
        { name: "React" },
        { label: "Node" },
        { something: "Else" }, // Should be filtered out
        "TypeScript",
      ];
      expect(normalizeSkills(skills)).toEqual(["React", "Node", "TypeScript"]);
    });
  });

  describe("normalizeTimelineItems", () => {
    it("returns empty array for non-array values", () => {
      expect(normalizeTimelineItems(null)).toEqual([]);
    });

    it("maps various field names to timeline item structure", () => {
      const items = [
        {
          title: "Software Engineer",
          company: "Google",
          startDate: "2020-01-01",
          endDate: "2021-01-01",
        },
        { role: "Intern", institution: "Univ", year: "2019" },
        { degree: "BSCS", organization: "College", duration: "4 years" },
        { name: "Project", description: "Desc", achievements: ["A1"] },
        { headline: "Something", subline: "Sub" }, // Should be filtered out because no headline/role/etc
      ];
      const normalized = normalizeTimelineItems(items);
      expect(normalized[0]).toMatchObject({
        headline: "Software Engineer",
        subline: "Google",
        meta: expect.stringContaining("2020"),
      });
      expect(normalized[1]).toMatchObject({
        headline: "Intern",
        subline: "Univ",
        meta: "2019",
      });
      expect(normalized[2]).toMatchObject({
        headline: "BSCS",
        subline: "College",
        meta: "4 years",
      });
      expect(normalized[3]).toMatchObject({
        headline: "Project",
        description: "Desc",
        bullets: ["A1"],
      });
    });

    it("handles startDate without endDate as Present", () => {
      const items = [{ title: "Dev", startDate: "2020-01-01" }];
      const normalized = normalizeTimelineItems(items);
      expect(normalized[0].meta).toContain("Present");
    });

    it("handles invalid dates gracefully", () => {
      const items = [
        { title: "Dev", startDate: "Invalid Date", endDate: "No Date" },
      ];
      const normalized = normalizeTimelineItems(items);
      expect(normalized[0].meta).toBe("Invalid Date • No Date");
    });

    it("handles empty values in date normalization", () => {
      // normalizeDate is internal but called via formatRange
      const items = [{ title: "Dev", startDate: "", endDate: "2021" }];
      const normalized = normalizeTimelineItems(items);
      expect(normalized[0].meta).toBe("2021");
    });

    it("handles missing start date but present end date", () => {
      const items = [{ title: "Dev", endDate: "2021" }];
      const normalized = normalizeTimelineItems(items);
      expect(normalized[0].meta).toBe("2021");
    });

    it("handles null/undefined values in date normalization", () => {
      const items = [{ title: "Dev", startDate: null, endDate: "2021" }];
      const items2 = [{ title: "Dev2", startDate: undefined, endDate: "2022" }];
      const normalized = normalizeTimelineItems([...items, ...items2]);
      expect(normalized[0].meta).toBe("2021");
      expect(normalized[1].meta).toBe("2022");
    });

    it("filters out items without a headline", () => {
      const items = [{ company: "No Title" }];
      expect(normalizeTimelineItems(items)).toHaveLength(0);
    });
  });

  describe("normalizeProjects", () => {
    it("returns empty array for non-array values", () => {
      expect(normalizeProjects(null)).toEqual([]);
    });

    it("maps project fields correctly", () => {
      const projects = [
        {
          name: "System",
          role: "Lead",
          duration: "1 mo",
          description: "A system",
          technologies: ["Java"],
          url: "http://test.com",
        },
        { name: "App", year: "2022" },
      ];
      const normalized = normalizeProjects(projects);
      expect(normalized[0]).toEqual({
        headline: "System",
        subline: "Lead",
        meta: "1 mo",
        description: "A system",
        technologies: ["Java"],
        url: "http://test.com",
      });
      expect(normalized[1].meta).toBe("2022");
    });

    it("filters out projects without a headline (name)", () => {
      const projects = [{ role: "No Name" }];
      expect(normalizeProjects(projects)).toHaveLength(0);
    });
  });

  describe("normalizeCertifications", () => {
    it("returns empty array for non-array values", () => {
      expect(normalizeCertifications(null)).toEqual([]);
      expect(normalizeCertifications(undefined)).toEqual([]);
      expect(normalizeCertifications("cert")).toEqual([]);
    });

    it("maps certification fields correctly", () => {
      const certs = [
        {
          name: "AWS Solutions Architect",
          issuer: "Amazon",
          issueDate: "2023-01",
          expiryDate: "2026-01",
          credentialId: "ABC123",
          credentialUrl: "https://example.com/cert",
        },
      ];
      const normalized = normalizeCertifications(certs);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].headline).toBe("AWS Solutions Architect");
      expect(normalized[0].subline).toBe("Amazon");
      expect(normalized[0].meta).toContain("2023-01");
      expect(normalized[0].meta).toContain("Exp 2026-01");
      expect(normalized[0].description).toBe("Credential ID: ABC123");
      expect(normalized[0].url).toBe("https://example.com/cert");
    });

    it("handles certification without expiry date", () => {
      const certs = [{ name: "PMP", issuer: "PMI", issueDate: "2022-06" }];
      const normalized = normalizeCertifications(certs);
      expect(normalized[0].meta).toBe("2022-06");
    });

    it("handles certification without any dates", () => {
      const certs = [{ name: "Cert", issuer: "Org" }];
      const normalized = normalizeCertifications(certs);
      expect(normalized[0].meta).toBeUndefined();
    });

    it("handles certification without credentialId", () => {
      const certs = [{ name: "Cert", issuer: "Org" }];
      const normalized = normalizeCertifications(certs);
      expect(normalized[0].description).toBeUndefined();
    });

    it("filters out certifications without a name", () => {
      const certs = [{ issuer: "No Name" }];
      expect(normalizeCertifications(certs)).toHaveLength(0);
    });
  });

  describe("normalizeLanguages", () => {
    it("returns empty array for non-array values", () => {
      expect(normalizeLanguages(null)).toEqual([]);
      expect(normalizeLanguages(undefined)).toEqual([]);
      expect(normalizeLanguages("en")).toEqual([]);
    });

    it("maps language fields correctly", () => {
      const langs = [
        { language: "English", proficiency: "native" },
        { language: "Spanish", proficiency: "intermediate" },
      ];
      const normalized = normalizeLanguages(langs);
      expect(normalized).toEqual([
        { language: "English", proficiency: "native" },
        { language: "Spanish", proficiency: "intermediate" },
      ]);
    });

    it("defaults proficiency to 'conversational' when not provided", () => {
      const langs = [{ language: "French" }];
      const normalized = normalizeLanguages(langs);
      expect(normalized[0].proficiency).toBe("conversational");
    });

    it("filters out items without a language field", () => {
      const langs = [
        { language: "English", proficiency: "native" },
        { proficiency: "basic" }, // No language
        { language: null }, // Null language
      ];
      const normalized = normalizeLanguages(langs);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].language).toBe("English");
    });
  });

  describe("normalizeAwards", () => {
    it("returns empty array for non-array values", () => {
      expect(normalizeAwards(null)).toEqual([]);
      expect(normalizeAwards(undefined)).toEqual([]);
      expect(normalizeAwards("award")).toEqual([]);
    });

    it("maps award fields using title", () => {
      const awards = [
        {
          title: "Best Paper Award",
          issuer: "ACM",
          date: "2023-06",
          description: "For outstanding research",
        },
      ];
      const normalized = normalizeAwards(awards);
      expect(normalized[0]).toEqual({
        headline: "Best Paper Award",
        subline: "ACM",
        meta: "2023-06",
        description: "For outstanding research",
      });
    });

    it("maps award fields using name fallback", () => {
      const awards = [{ name: "Employee of the Year", year: "2024" }];
      const normalized = normalizeAwards(awards);
      expect(normalized[0].headline).toBe("Employee of the Year");
      expect(normalized[0].meta).toBe("2024");
    });

    it("prefers title over name", () => {
      const awards = [{ title: "Primary", name: "Secondary" }];
      const normalized = normalizeAwards(awards);
      expect(normalized[0].headline).toBe("Primary");
    });

    it("prefers date over year", () => {
      const awards = [{ title: "Award", date: "2023-01", year: "2023" }];
      const normalized = normalizeAwards(awards);
      expect(normalized[0].meta).toBe("2023-01");
    });

    it("filters out awards without a headline", () => {
      const awards = [{ issuer: "No Title" }];
      expect(normalizeAwards(awards)).toHaveLength(0);
    });
  });
});
