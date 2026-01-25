import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
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
      // @ts-ignore
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
});
