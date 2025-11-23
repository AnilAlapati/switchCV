import { normalizeResumeForEditor } from "./resumeEditor";

describe("resumeEditor normalization", () => {
  describe("normalizeResumeForEditor", () => {
    it("should handle null or undefined input", () => {
      const result = normalizeResumeForEditor(null);
      expect(result.profile).toBeDefined();
      expect(result.resume).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.profile.skills).toEqual([]);
      expect(result.profile.experience).toEqual([]);
    });

    it("should normalize skills correctly", () => {
      const raw = {
        skills: [
          "JavaScript",
          { name: "TypeScript", level: "expert", visibility: "public" },
          null,
          { name: "React" }, // Missing level/visibility
        ],
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.skills).toHaveLength(4);
      expect(result.profile.skills![0]).toEqual({
        name: "JavaScript",
        level: "intermediate",
        visibility: "public",
      });
      expect(result.profile.skills![1]).toEqual({
        name: "TypeScript",
        level: "expert",
        visibility: "public",
      });
      expect(result.profile.skills![2]).toEqual({
        name: "",
        level: "intermediate",
        visibility: "public",
      });
      expect(result.profile.skills![3]).toEqual({
        name: "React",
        level: "intermediate",
        visibility: "public",
      });
    });

    it("should normalize experience correctly", () => {
      const raw = {
        experience: [
          null,
          {
            company: "Tech Co",
            role: "Dev",
            startDate: "2020",
            visibility: "masked",
          },
          { title: "Lead", from: "2018", to: "2020", summary: "Good work" }, // Legacy fields
        ],
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.experience).toHaveLength(3);
      expect(result.profile.experience![0]).toEqual({
        company: "",
        role: "",
        startDate: "",
        description: "",
        visibility: "public",
      });
      expect(result.profile.experience![1]).toEqual({
        company: "Tech Co",
        role: "Dev",
        startDate: "2020",
        endDate: undefined,
        description: "",
        visibility: "masked",
      });
      expect(result.profile.experience![2]).toEqual({
        company: "",
        role: "Lead",
        startDate: "2018",
        endDate: "2020",
        description: "Good work",
        visibility: "public",
      });
    });

    it("should normalize education correctly", () => {
      const raw = {
        education: [
          null,
          {
            institution: "Uni",
            degree: "BS",
            startDate: "2016",
            visibility: "request",
          },
          { title: "MS", from: "2018", to: "2020" }, // Legacy fields
        ],
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.education).toHaveLength(3);
      expect(result.profile.education![0]).toEqual({
        institution: "",
        degree: "",
        startDate: "",
        visibility: "public",
      });
      expect(result.profile.education![1]).toEqual({
        institution: "Uni",
        degree: "BS",
        startDate: "2016",
        endDate: undefined,
        description: undefined,
        visibility: "request",
      });
      expect(result.profile.education![2]).toEqual({
        institution: "",
        degree: "MS",
        startDate: "2018",
        endDate: "2020",
        description: undefined,
        visibility: "public",
      });
    });

    it("should normalize projects correctly", () => {
      const raw = {
        projects: [
          null,
          { name: "Project A", description: "Desc", visibility: "public" },
          { title: "Project B", url: "http://example.com" }, // Legacy fields
        ],
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.projects).toHaveLength(3);
      expect(result.profile.projects![0]).toEqual({
        name: "",
        description: "",
        visibility: "public",
      });
      expect(result.profile.projects![1]).toEqual({
        name: "Project A",
        description: "Desc",
        url: undefined,
        visibility: "public",
      });
      expect(result.profile.projects![2]).toEqual({
        name: "Project B",
        description: "",
        url: "http://example.com",
        visibility: "public",
      });
    });

    it("should normalize contact info correctly", () => {
      const raw = {
        contact: {
          email: { value: "test@example.com", visibility: "masked" },
          phone: "123-456-7890", // String format
        },
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.contact).toEqual({
        email: { value: "test@example.com", visibility: "masked" },
        phone: { value: "123-456-7890", visibility: "public" }, // Default visibility for string
      });
    });

    it("should handle missing contact info", () => {
      const raw = { contact: null };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.contact).toEqual({
        email: { value: "", visibility: "masked" },
        phone: { value: "", visibility: "masked" },
      });
    });

    it("should normalize personal info correctly", () => {
      const raw = {
        personalInfo: {
          name: "John Doe",
          title: "Developer",
          email: "john@example.com",
        },
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.profile.personalInfo).toEqual({
        name: "John Doe",
        title: "Developer",
        email: "john@example.com",
        phone: undefined,
        location: undefined,
        linkedin: undefined,
        github: undefined,
      });
    });

    it("should extract meta data correctly", () => {
      const raw = {
        userId: "user-1",
        numericId: 123,
        isPublic: true,
        visibility: "public",
        templateId: "modern",
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.meta).toEqual({
        userId: "user-1",
        numericId: 123,
        isPublic: true,
        visibility: "public",
        templateId: "modern",
      });
    });

    it("should handle legacy id and visibility in meta", () => {
      const raw = {
        id: 456, // Legacy numericId
        visibility: "public", // implies isPublic = true
      };
      const result = normalizeResumeForEditor(raw);
      expect(result.meta.numericId).toBe(456);
      expect(result.meta.isPublic).toBe(true);
    });
  });
});
