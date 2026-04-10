/**
 * Tests for ConversationManager
 */

import {
  ConversationManager,
  ResumeDataRequirements,
} from "@/lib/services/conversationManager";

describe("ConversationManager", () => {
  describe("constructor", () => {
    it("should initialize with empty data", () => {
      const manager = new ConversationManager();
      expect(manager.getData()).toEqual({});
    });

    it("should initialize with provided data", () => {
      const initialData: Partial<ResumeDataRequirements> = {
        name: "John Doe",
        email: "john@example.com",
      };
      const manager = new ConversationManager(initialData);
      expect(manager.getData()).toEqual(initialData);
    });
  });

  describe("updateData", () => {
    it("should update collected data", () => {
      const manager = new ConversationManager();
      manager.updateData({ name: "John Doe" });
      expect(manager.getData().name).toBe("John Doe");
    });

    it("should merge new data with existing", () => {
      const manager = new ConversationManager({ name: "John" });
      manager.updateData({ email: "john@example.com" });

      const data = manager.getData();
      expect(data.name).toBe("John");
      expect(data.email).toBe("john@example.com");
    });

    it("should override existing fields", () => {
      const manager = new ConversationManager({ name: "John" });
      manager.updateData({ name: "Jane" });
      expect(manager.getData().name).toBe("Jane");
    });
  });

  describe("getProgress", () => {
    it("should return 0% for empty data", () => {
      const manager = new ConversationManager();
      const progress = manager.getProgress();
      expect(progress.completenessPercentage).toBe(0);
      expect(progress.collectedFields).toEqual([]);
      expect(progress.isReadyToCreate).toBe(false);
    });

    it("should calculate correct percentage", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Professional summary",
        experience: [
          {
            title: "Developer",
            company: "Tech Corp",
            duration: "2020-2023",
            description: "Built things",
          },
        ],
      });

      const progress = manager.getProgress();
      expect(progress.completenessPercentage).toBeGreaterThan(0);
      expect(progress.collectedFields).toContain("name");
      expect(progress.collectedFields).toContain("email");
    });

    it("should mark as ready when minimum data exists", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Professional summary",
      });

      const progress = manager.getProgress();
      expect(progress.hasMinimumData).toBe(true);
      expect(progress.isReadyToCreate).toBe(true);
    });

    it("should not be ready without minimum data", () => {
      const manager = new ConversationManager({
        name: "John Doe",
      });

      const progress = manager.getProgress();
      expect(progress.hasMinimumData).toBe(false);
    });
  });

  describe("validate", () => {
    it("should pass validation with minimum data", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
      });

      const result = manager.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation without required fields", () => {
      const manager = new ConversationManager({
        name: "John Doe",
      });

      const result = manager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate email format", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "invalid-email",
        summary: "Summary",
      });

      const result = manager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("email"))).toBe(true);
    });

    it("should accept valid email", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
      });

      const result = manager.validate();
      expect(result.valid).toBe(true);
    });

    it("should enforce strict validation for skills and experience/education", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
      });

      const result = manager.validate({ strictMode: true });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes("At least one of experience or education"),
        ),
      ).toBe(true);
      expect(
        result.errors.some((error) => error.includes("At least one skill")),
      ).toBe(true);
    });

    it("should pass strict validation when required structures are present", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
        experience: [
          {
            title: "Developer",
            company: "Tech Corp",
            duration: "",
            description: "",
          },
        ],
        skills: ["TypeScript"],
      });

      const result = manager.validate({ strictMode: true });
      expect(result.valid).toBe(true);
    });
  });

  describe("getNextQuestion", () => {
    it("should return null when ready to create", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
        experience: [
          {
            title: "Dev",
            company: "Corp",
            duration: "2020",
            description: "Work",
          },
        ],
      });

      const question = manager.getNextQuestion();
      expect(question).toBeNull();
    });

    it("should ask for name first if missing", () => {
      const manager = new ConversationManager();
      const question = manager.getNextQuestion();
      expect(question).toContain("name");
    });

    it("should ask for email after name", () => {
      const manager = new ConversationManager({ name: "John Doe" });
      const question = manager.getNextQuestion();
      expect(question).toContain("email");
    });
  });

  describe("toResumeFormat", () => {
    it("should convert to resume format", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        location: "New York",
        summary: "Professional developer",
        experience: [
          {
            title: "Developer",
            company: "Tech Corp",
            duration: "2020-2023",
            description: "Built applications",
          },
        ],
        education: [
          {
            degree: "BS Computer Science",
            institution: "University",
            year: "2020",
          },
        ],
        skills: ["JavaScript", "React", "Node.js"],
      });

      const resume = manager.toResumeFormat();

      expect(resume.title).toContain("John Doe");
      expect(resume.personalInfo.name).toBe("John Doe");
      expect(resume.personalInfo.email).toBe("john@example.com");
      expect(resume.summary).toBe("Professional developer");
      expect(resume.experience).toHaveLength(1);
      expect(resume.education).toHaveLength(1);
      expect(resume.skills).toHaveLength(3);
      expect(resume.createdVia).toBe("ai-conversation");
    });

    it("should handle missing optional fields", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
      });

      const resume = manager.toResumeFormat();

      expect(resume.personalInfo.phone).toBe("");
      expect(resume.personalInfo.location).toBe("");
      expect(resume.experience).toEqual([]);
      expect(resume.education).toEqual([]);
      expect(resume.skills).toEqual([]);
    });
  });

  describe("getSummary", () => {
    it("should generate user-friendly summary", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        experience: [
          {
            title: "Dev",
            company: "Corp",
            duration: "2020",
            description: "Work",
          },
        ],
        skills: ["JavaScript", "React"],
      });

      const summary = manager.getSummary();

      expect(summary).toContain("Progress:");
      expect(summary).toContain("John Doe");
      expect(summary).toContain("john@example.com");
      expect(summary).toContain("Experience:");
      expect(summary).toContain("Skills:");
    });

    it("should show completion message when ready", () => {
      const manager = new ConversationManager({
        name: "John Doe",
        email: "john@example.com",
        summary: "Summary",
        experience: [
          {
            title: "Dev",
            company: "Corp",
            duration: "2020",
            description: "Work",
          },
        ],
      });

      const summary = manager.getSummary();
      expect(summary).toContain("enough information");
    });
  });

  describe("updateData — protective merge", () => {
    it("should NOT overwrite existing experience with an empty array", () => {
      const manager = new ConversationManager({
        name: "Anil",
        email: "anil@test.com",
        experience: [
          {
            title: "SWE3",
            company: "JPMC",
            duration: "2020-present",
            description: "Team Lead",
          },
        ],
      });

      // Simulate a later extraction that has education but missed experience
      manager.updateData({
        education: [
          {
            degree: "B.Tech",
            institution: "S.B.C.E",
            year: "2010-2014",
            major: "E.C.E",
            gpa: "7.23",
          },
        ],
        experience: [], // empty — extraction failed to parse experience
      });

      // Experience MUST be preserved
      expect(manager.getData().experience).toHaveLength(1);
      expect(manager.getData().experience![0].company).toBe("JPMC");
      // Education should be added
      expect(manager.getData().education).toHaveLength(1);
    });

    it("should NOT overwrite existing skills with an empty array", () => {
      const manager = new ConversationManager({
        name: "Anil",
        skills: ["TypeScript", "React", "AI"],
      });

      manager.updateData({ skills: [] });

      expect(manager.getData().skills).toHaveLength(3);
    });

    it("should NOT overwrite a non-empty string with an empty string", () => {
      const manager = new ConversationManager({
        name: "Anil",
        summary: "Experienced engineer",
      });

      manager.updateData({ summary: "" });

      expect(manager.getData().summary).toBe("Experienced engineer");
    });

    it("should NOT overwrite a non-empty string with whitespace", () => {
      const manager = new ConversationManager({
        name: "Anil",
        email: "anil@test.com",
      });

      manager.updateData({ name: "  " });

      expect(manager.getData().name).toBe("Anil");
    });

    it("SHOULD overwrite populated fields with populated new values", () => {
      const manager = new ConversationManager({
        name: "Anil",
        email: "old@test.com",
      });

      manager.updateData({ email: "new@test.com" });

      expect(manager.getData().email).toBe("new@test.com");
    });

    it("SHOULD merge experience array when new array has items (not full replace)", () => {
      const manager = new ConversationManager({
        experience: [
          {
            title: "Old Role",
            company: "Old Corp",
            duration: "",
            description: "",
          },
        ],
      });

      manager.updateData({
        experience: [
          {
            title: "SWE3",
            company: "JPMC",
            duration: "2020-present",
            description: "Team Lead",
          },
          {
            title: "Developer",
            company: "IBM",
            duration: "2015-2018",
            description: "Software development",
          },
        ],
      });

      // Smart merge: keeps Old Corp + adds JPMC + IBM = 3 entries
      expect(manager.getData().experience).toHaveLength(3);
      expect(manager.getData().experience![0].company).toBe("Old Corp");
      expect(manager.getData().experience![1].company).toBe("JPMC");
      expect(manager.getData().experience![2].company).toBe("IBM");
    });

    it("should skip undefined and null values without erasing existing data", () => {
      const manager = new ConversationManager({
        name: "Anil",
        email: "anil@test.com",
        location: "Hyderabad",
      });

      manager.updateData({
        name: undefined,
        email: undefined,
      } as Partial<
        typeof manager extends ConversationManager
          ? Parameters<typeof manager.updateData>[0]
          : never
      >);

      expect(manager.getData().name).toBe("Anil");
      expect(manager.getData().email).toBe("anil@test.com");
    });

    it("simulates full multi-turn conversation without data loss", () => {
      const manager = new ConversationManager();

      // Turn 1: User gives name + email
      manager.updateData({
        name: "Anil A",
        email: "anilalapati.66@gmail.com",
      });
      expect(manager.getData().name).toBe("Anil A");

      // Turn 2: User gives experience
      manager.updateData({
        experience: [
          {
            title: "SWE3",
            company: "JPMC",
            duration: "current",
            description: "Team Lead, automation projects",
          },
          {
            title: "Developer",
            company: "IBM",
            duration: "2015-2018",
            description: "Software development",
          },
        ],
      });
      expect(manager.getData().experience).toHaveLength(2);

      // Turn 3: User gives education — extraction MISSES experience
      manager.updateData({
        education: [
          {
            degree: "B.Tech",
            institution: "S.B.C.E",
            year: "2010-2014",
            major: "E.C.E",
            gpa: "7.23",
          },
        ],
        experience: [], // Extraction failed to re-extract experience
      });

      // CRITICAL: name, email, experience, AND education must ALL be present
      const data = manager.getData();
      expect(data.name).toBe("Anil A");
      expect(data.email).toBe("anilalapati.66@gmail.com");
      expect(data.experience).toHaveLength(2);
      expect(data.education).toHaveLength(1);

      const progress = manager.getProgress();
      // name + email + experience + education = 4/7 core fields = 57%
      expect(progress.completenessPercentage).toBeGreaterThanOrEqual(57);
    });
  });
});
