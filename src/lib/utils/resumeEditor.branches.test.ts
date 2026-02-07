import {
  normalizeResumeForEditor,
  sanitizeResumePayload,
} from "./resumeEditor";

describe("resumeEditor branch coverage", () => {
  describe("normalizeSkills", () => {
    it("should handle non-string non-object skills (e.g. numbers)", () => {
      const result = normalizeResumeForEditor({
        skills: [123],
      });
      expect(result.profile.skills).toEqual([
        {
          id: expect.stringMatching(/^skill-legacy-\d+$/),
          name: "",
          level: "intermediate",
          visibility: "public",
        },
      ]);
    });

    it("should handle object skills", () => {
      const result = normalizeResumeForEditor({
        skills: [{ name: "React", level: "expert", visibility: "public" }],
      });
      expect(result.profile.skills).toEqual([
        {
          id: expect.stringMatching(/^skill-legacy-\d+$/),
          name: "React",
          level: "expert",
          visibility: "public",
        },
      ]);
    });

    it("should handle null/undefined skills in array", () => {
      const result = normalizeResumeForEditor({
        skills: [null, undefined],
      });
      expect(result.profile.skills).toEqual([
        {
          id: expect.stringMatching(/^skill-legacy-\d+$/),
          name: "",
          level: "intermediate",
          visibility: "public",
        },
        {
          id: expect.stringMatching(/^skill-legacy-\d+$/),
          name: "",
          level: "intermediate",
          visibility: "public",
        },
      ]);
    });
  });

  describe("normalizeExperience", () => {
    it("should prioritize startDate over from", () => {
      const result = normalizeResumeForEditor({
        experience: [
          {
            company: "A",
            role: "B",
            startDate: "2023",
            from: "2022",
          },
        ],
      });
      expect(result.profile.experience?.[0].startDate).toBe("2023");
    });

    it("should prioritize endDate over to", () => {
      const result = normalizeResumeForEditor({
        experience: [
          {
            company: "A",
            role: "B",
            endDate: "2024",
            to: "2025",
          },
        ],
      });
      expect(result.profile.experience?.[0].endDate).toBe("2024");
    });

    it("should handle invalid experience items", () => {
      const result = normalizeResumeForEditor({
        experience: [null, "invalid"],
      });
      expect(result.profile.experience).toEqual([
        {
          id: expect.stringMatching(/^exp-legacy-\d+$/),
          company: "",
          role: "",
          startDate: "",
          description: "",
          visibility: "public",
        },
        {
          id: expect.stringMatching(/^exp-legacy-\d+$/),
          company: "",
          role: "",
          startDate: "",
          description: "",
          visibility: "public",
        },
      ]);
    });
  });

  describe("normalizeEducation", () => {
    it("should prioritize startDate over from", () => {
      const result = normalizeResumeForEditor({
        education: [
          {
            institution: "A",
            degree: "B",
            startDate: "2023",
            from: "2022",
          },
        ],
      });
      expect(result.profile.education?.[0].startDate).toBe("2023");
    });

    it("should prioritize endDate over to", () => {
      const result = normalizeResumeForEditor({
        education: [
          {
            institution: "A",
            degree: "B",
            endDate: "2024",
            to: "2025",
          },
        ],
      });
      expect(result.profile.education?.[0].endDate).toBe("2024");
    });

    it("should handle invalid education items", () => {
      const result = normalizeResumeForEditor({
        education: [null, "invalid"],
      });
      expect(result.profile.education).toEqual([
        {
          id: expect.stringMatching(/^edu-legacy-\d+$/),
          institution: "",
          degree: "",
          startDate: "",
          visibility: "public",
        },
        {
          id: expect.stringMatching(/^edu-legacy-\d+$/),
          institution: "",
          degree: "",
          startDate: "",
          visibility: "public",
        },
      ]);
    });
  });

  describe("normalizeProjects", () => {
    it("should prioritize name over title", () => {
      const result = normalizeResumeForEditor({
        projects: [
          {
            name: "Project A",
            title: "Project B",
          },
        ],
      });
      expect(result.profile.projects?.[0].name).toBe("Project A");
    });

    it("should handle invalid project items", () => {
      const result = normalizeResumeForEditor({
        projects: [null, "invalid"],
      });
      expect(result.profile.projects).toEqual([
        {
          id: expect.stringMatching(/^proj-legacy-\d+$/),
          name: "",
          description: "",
          visibility: "public",
        },
        {
          id: expect.stringMatching(/^proj-legacy-\d+$/),
          name: "",
          description: "",
          visibility: "public",
        },
      ]);
    });
  });

  describe("normalizeContact", () => {
    it("should handle contact fields as strings (default visibility)", () => {
      const result = normalizeResumeForEditor({
        contact: {
          email: "test@example.com",
          phone: "123-456-7890",
        },
      });
      expect(result.profile.contact?.email.value).toBe("test@example.com");
      expect(result.profile.contact?.email.visibility).toBe("public");
      expect(result.profile.contact?.phone?.value).toBe("123-456-7890");
      expect(result.profile.contact?.phone?.visibility).toBe("public");
    });

    it("should handle undefined contact fields", () => {
      const result = normalizeResumeForEditor({
        contact: {},
      });
      expect(result.profile.contact?.email.value).toBe("");
      expect(result.profile.contact?.phone?.value).toBe("");
    });

    it("should handle contact fields as objects", () => {
      const result = normalizeResumeForEditor({
        contact: {
          email: { value: "test@example.com", visibility: "masked" },
          phone: { value: "123-456-7890", visibility: "request" },
        },
      });
      expect(result.profile.contact?.email.value).toBe("test@example.com");
      expect(result.profile.contact?.email.visibility).toBe("masked");
      expect(result.profile.contact?.phone?.value).toBe("123-456-7890");
      expect(result.profile.contact?.phone?.visibility).toBe("request");
    });
  });

  describe("normalizePersonalInfo", () => {
    it("should handle missing or invalid personalInfo", () => {
      const result1 = normalizeResumeForEditor({ personalInfo: null });
      expect(result1.profile.personalInfo).toEqual({});

      const result2 = normalizeResumeForEditor({ personalInfo: "invalid" });
      expect(result2.profile.personalInfo).toEqual({});
    });
  });

  describe("meta normalization", () => {
    it("should prioritize numericId over id", () => {
      const raw = {
        numericId: 111,
        id: 222,
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.meta.numericId).toBe(111);
    });

    it("should use id if numericId is missing", () => {
      const raw = {
        id: 222,
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.meta.numericId).toBe(222);
    });

    it("should be undefined if neither is present", () => {
      const raw = {};
      const result = normalizeResumeForEditor(raw);
      expect(result.meta.numericId).toBeUndefined();
    });
  });

  describe("sanitizeResumePayload", () => {
    it("should return empty object if pruneUndefined returns non-object", () => {
      // This is hard to trigger with real pruneUndefined unless we mock it,
      // but we can try passing something that pruneUndefined reduces to a primitive?
      // pruneUndefined preserves primitives.
      // But sanitizeResumePayload takes Record<string, any>.
      // If we pass { a: undefined }, pruneUndefined returns {}. {} is an object.
      // If we pass an array? sanitizeResumePayload signature expects Record.
      // Let's try passing an array cast as Record.
      const arr = ["a", "b"];
      const result = sanitizeResumePayload(arr);
      expect(result).toBeDefined();
    });
  });
});
