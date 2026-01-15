/**
 * Tests for lib/utils/resumeEditor utilities
 */

import {
  normalizeResumeForEditor,
  sanitizeResumePayload,
  mergeProfileIntoResume,
} from "./resumeEditor";

describe("resumeEditor Utilities", () => {
  describe("normalizeResumeForEditor", () => {
    it("should normalize a full resume correctly", () => {
      const raw = {
        userId: "user123",
        numericId: 456,
        title: "Software Engineer",
        summary: "Experienced dev",
        skills: [
          "React",
          { name: "Node", level: "expert", visibility: "public" },
        ],
        experience: [
          {
            company: "Tech Corp",
            title: "Senior Dev",
            from: "2020-01",
            summary: "Built things",
          },
        ],
        education: [
          {
            institution: "Uni",
            title: "CS Degree",
            from: "2016",
          },
        ],
        projects: [
          {
            title: "Project X",
            description: "Cool project",
          },
        ],
        contact: {
          email: "test@example.com",
          phone: { value: "123-456", visibility: "request" },
        },
        personalInfo: {
          name: "John Doe",
        },
        templateId: "modern",
      };

      const { profile, resume, meta } = normalizeResumeForEditor(raw);

      // Check meta
      expect(meta.userId).toBe("user123");
      expect(meta.numericId).toBe(456);
      expect(meta.templateId).toBe("modern");

      // Check skills normalization
      expect(profile.skills).toHaveLength(2);
      expect(profile.skills?.[0]).toEqual({
        id: expect.stringMatching(/^skill-legacy-\d+$/),
        name: "React",
        level: "intermediate",
        visibility: "public",
      });

      // Check experience normalization
      expect(profile.experience?.[0].role).toBe("Senior Dev");
      expect(profile.experience?.[0].startDate).toBe("2020-01");
      expect(profile.experience?.[0].description).toBe("Built things");

      // Check education normalization
      expect(profile.education?.[0].degree).toBe("CS Degree");

      // Check projects normalization
      expect(profile.projects?.[0].name).toBe("Project X");

      // Check contact normalization
      expect(profile.contact?.email.value).toBe("test@example.com");
      expect(profile.contact?.email.visibility).toBe("public");
      expect(profile.contact?.phone.value).toBe("123-456");
      expect(profile.contact?.phone.visibility).toBe("request");
    });

    it("should handle numericId fallback to id", () => {
      const { meta } = normalizeResumeForEditor({ id: 789 });
      expect(meta.numericId).toBe(789);
    });

    it("should handle numericId when it is not a number but id is", () => {
      const { meta } = normalizeResumeForEditor({
        numericId: "not-a-number",
        id: 123,
      });
      expect(meta.numericId).toBe(123);
    });

    it("should handle numericId when both are not numbers", () => {
      const { meta } = normalizeResumeForEditor({ numericId: "a", id: "b" });
      expect(meta.numericId).toBeUndefined();
    });

    it("should handle isPublic mapping from visibility", () => {
      const { meta: meta1 } = normalizeResumeForEditor({
        visibility: "public",
      });
      expect(meta1.isPublic).toBe(true);

      const { meta: meta2 } = normalizeResumeForEditor({
        visibility: "private",
      });
      expect(meta2.isPublic).toBe(false);
    });

    it("should handle invalid inputs for sub-normalizers", () => {
      const raw = {
        skills: [null, 123, {}, "Simple Skill"],
        experience: [null, "invalid", { visibility: "invalid" }],
        education: [null, { visibility: "invalid" }],
        projects: [null, { visibility: "invalid" }],
        contact: {
          email: { value: "test@test.com" }, // missing visibility
          phone: "123456",
        },
        personalInfo: "invalid",
      };

      const { profile } = normalizeResumeForEditor(raw);

      expect(profile.skills).toHaveLength(4);
      expect(profile.skills?.[0].name).toBe("");
      expect(profile.skills?.[3].name).toBe("Simple Skill");
      expect(profile.experience).toHaveLength(3);
      expect(profile.experience?.[0].company).toBe("");
      expect(profile.experience?.[2].visibility).toBe("public");
      expect(profile.contact?.email.value).toBe("test@test.com");
      expect(profile.contact?.email.visibility).toBe("public");
      expect(profile.contact?.phone.value).toBe("123456");
      expect(profile.personalInfo).toEqual({});
    });

    it("should handle contact object with missing values", () => {
      const raw = {
        contact: {
          email: { visibility: "masked" },
          phone: { visibility: "request" },
        },
      };
      const { profile } = normalizeResumeForEditor(raw);
      expect(profile.contact?.email.value).toBe("");
      expect(profile.contact?.email.visibility).toBe("masked");
      expect(profile.contact?.phone.value).toBe("");
      expect(profile.contact?.phone.visibility).toBe("request");
    });

    it("should handle empty or null input", () => {
      const { profile, resume, meta } = normalizeResumeForEditor(null);
      expect(profile.title).toBe("");
      expect(resume).toEqual({
        skills: [],
        experience: [],
        education: [],
        projects: [],
        contact: {
          email: { value: "", visibility: "masked" },
          phone: { value: "", visibility: "masked" },
        },
        personalInfo: {},
      });
      expect(meta.userId).toBeUndefined();
    });
  });

  describe("sanitizeResumePayload", () => {
    it("should remove reserved fields and undefined values", () => {
      const payload = {
        title: "New Title",
        userId: "should-be-removed",
        numericId: 123,
        createdAt: "date",
        updatedAt: "date",
        isPublic: true,
        visibility: "public",
        status: "active",
        other: "keep",
        missing: undefined,
      };

      const sanitized = sanitizeResumePayload(payload);

      expect(sanitized).toEqual({
        title: "New Title",
        other: "keep",
      });
      expect(sanitized.userId).toBeUndefined();
      expect(sanitized.numericId).toBeUndefined();
    });

    it("should handle non-object input", () => {
      expect(sanitizeResumePayload(null as any)).toEqual({});
      expect(sanitizeResumePayload("string" as any)).toEqual({});
    });

    it("should handle payload that becomes empty after pruning", () => {
      const payload = { userId: "123" };
      expect(sanitizeResumePayload(payload)).toEqual({});
    });
  });

  describe("mergeProfileIntoResume", () => {
    it("should merge all profile fields into original resume", () => {
      const original = {
        title: "Old Title",
        summary: "Old Summary",
        personalInfo: { name: "John" },
        contact: {
          email: { value: "old@test.com", visibility: "public" },
        },
      };

      const profile = {
        title: "New Title",
        summary: "New Summary",
        skills: [
          { name: "JS", level: "expert", visibility: "public" as const },
        ],
        experience: [
          {
            company: "A",
            role: "B",
            startDate: "C",
            description: "D",
            visibility: "public" as const,
          },
        ],
        education: [
          {
            institution: "E",
            degree: "F",
            startDate: "G",
            visibility: "public" as const,
          },
        ],
        projects: [
          { name: "H", description: "I", visibility: "public" as const },
        ],
        personalInfo: { title: "Engineer" },
        contact: {
          email: { value: "new@test.com", visibility: "masked" as const },
        },
      };

      const merged = mergeProfileIntoResume(original, profile as any);

      expect(merged.title).toBe("New Title");
      expect(merged.summary).toBe("New Summary");
      expect(merged.skills).toHaveLength(1);
      expect(merged.experience).toHaveLength(1);
      expect(merged.education).toHaveLength(1);
      expect(merged.projects).toHaveLength(1);
      expect(merged.personalInfo).toEqual({ name: "John", title: "Engineer" });
      expect(merged.contact.email.value).toBe("new@test.com");
      expect(merged.contact.email.visibility).toBe("masked");
      expect(merged.contact.phone.value).toBe("");
    });

    it("should handle null original resume", () => {
      const profile = { title: "New" };
      const merged = mergeProfileIntoResume(null, profile);
      expect(merged.title).toBe("New");
    });

    it("should handle partial profile updates", () => {
      const original = { title: "Old" };
      const merged = mergeProfileIntoResume(original, {
        summary: "New Summary",
      });
      expect(merged.title).toBe("Old");
      expect(merged.summary).toBe("New Summary");
    });

    it("should fallback to base contact values if profile contact is partial", () => {
      const original = {
        contact: {
          email: { value: "base@test.com", visibility: "public" },
          phone: { value: "123", visibility: "public" },
        },
      };
      const profile = {
        contact: {
          email: { value: "new@test.com" },
        },
      };
      const merged = mergeProfileIntoResume(original, profile as any);
      expect(merged.contact.email.value).toBe("new@test.com");
      expect(merged.contact.email.visibility).toBe("public");
      expect(merged.contact.phone.value).toBe("123");
      expect(merged.contact.phone.visibility).toBe("public");
    });

    it("should handle missing base contact in merge", () => {
      const original = {};
      const profile = {
        contact: {
          email: { value: "new@test.com" },
        },
      };
      const merged = mergeProfileIntoResume(original, profile as any);
      expect(merged.contact.email.value).toBe("new@test.com");
      expect(merged.contact.email.visibility).toBe("masked");
      expect(merged.contact.phone.value).toBe("");
      expect(merged.contact.phone.visibility).toBe("masked");
    });

    it("should handle missing base personalInfo in merge", () => {
      const original = {};
      const profile = { personalInfo: { name: "John" } };
      const merged = mergeProfileIntoResume(original, profile);
      expect(merged.personalInfo).toEqual({ name: "John" });
    });

    it("should handle partial contact in profile (only phone)", () => {
      const original = {
        contact: {
          email: { value: "email@test.com", visibility: "public" },
        },
      };
      const profile = {
        contact: {
          phone: { value: "123", visibility: "request" as const },
        },
      };
      const merged = mergeProfileIntoResume(original, profile as any);
      expect(merged.contact.email.value).toBe("email@test.com");
      expect(merged.contact.phone.value).toBe("123");
      expect(merged.contact.phone.visibility).toBe("request");
    });

    it("should handle contact with empty values in profile", () => {
      const original = {
        contact: {
          email: { value: "old@test.com", visibility: "public" },
        },
      };
      const profile = {
        contact: {
          email: { value: "", visibility: "masked" as const },
        },
      };
      const merged = mergeProfileIntoResume(original, profile as any);
      expect(merged.contact.email.value).toBe("");
      expect(merged.contact.email.visibility).toBe("masked");
    });
  });
});
