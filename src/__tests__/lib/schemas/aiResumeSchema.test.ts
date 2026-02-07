/**
 * Tests for AI Resume Response Schema
 */

import {
  AIResumeResponseSchema,
  AISkillSchema,
  AIExperienceSchema,
  AIEducationSchema,
  AIProjectSchema,
  AIContactSchema,
} from "@/lib/schemas/aiResumeSchema";

describe("AIResumeResponseSchema", () => {
  const validResume = {
    title: "Software Engineer",
    templateId: "standard-v1",
    summary: "Experienced software engineer with 5+ years...",
    skills: [
      { name: "TypeScript", level: "Expert", visibility: "public" as const },
      { name: "React", level: "Advanced", visibility: "public" as const },
    ],
    experience: [
      {
        company: "Tech Corp",
        role: "Senior Engineer",
        startDate: "2020-01",
        endDate: "Present",
        description: "Led development of...",
        visibility: "public" as const,
      },
    ],
    education: [
      {
        institution: "MIT",
        degree: "B.S. Computer Science",
        startDate: "2012-09",
        endDate: "2016-05",
        description: "Focus on distributed systems",
        visibility: "public" as const,
      },
    ],
    contact: {
      email: { value: "test@example.com", visibility: "public" as const },
      phone: { value: "+1-555-0123", visibility: "public" as const },
    },
    projects: [
      {
        name: "Open Source Library",
        description: "Contributed to...",
        visibility: "public" as const,
      },
    ],
  };

  it("should validate a complete valid resume", () => {
    const result = AIResumeResponseSchema.safeParse(validResume);
    expect(result.success).toBe(true);
  });

  describe("required fields", () => {
    it("should reject resume without title", () => {
       
      const { title: _, ...incomplete } = validResume;
      const result = AIResumeResponseSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("should reject resume without skills", () => {
       
      const { skills: _, ...incomplete } = validResume;
      const result = AIResumeResponseSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("should reject resume with empty skills array", () => {
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        skills: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject resume without experience", () => {
       
      const { experience: _, ...incomplete } = validResume;
      const result = AIResumeResponseSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("should reject resume without contact", () => {
       
      const { contact: _, ...incomplete } = validResume;
      const result = AIResumeResponseSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("should allow empty education array", () => {
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        education: [],
      });
      expect(result.success).toBe(true);
    });

    it("should allow empty projects array", () => {
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        projects: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("string length limits", () => {
    it("should reject title over 200 characters", () => {
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        title: "A".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("should reject summary over 2000 characters", () => {
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        summary: "A".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("array limits", () => {
    it("should reject more than 20 skills", () => {
      const tooManySkills = Array(21)
        .fill(null)
        .map((_, i) => ({
          name: `Skill ${i}`,
          level: "Expert",
          visibility: "public" as const,
        }));
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        skills: tooManySkills,
      });
      expect(result.success).toBe(false);
    });

    it("should reject more than 10 experience entries", () => {
      const tooManyExperiences = Array(11)
        .fill(null)
        .map((_, i) => ({
          company: `Company ${i}`,
          role: "Engineer",
          startDate: "2020-01",
          endDate: "2021-01",
          description: "Work",
          visibility: "public" as const,
        }));
      const result = AIResumeResponseSchema.safeParse({
        ...validResume,
        experience: tooManyExperiences,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Component Schemas", () => {
  describe("AISkillSchema", () => {
    it("should validate valid skill", () => {
      const result = AISkillSchema.safeParse({
        name: "TypeScript",
        level: "Expert",
        visibility: "public",
      });
      expect(result.success).toBe(true);
    });

    it("should reject skill with empty name", () => {
      const result = AISkillSchema.safeParse({
        name: "",
        level: "Expert",
        visibility: "public",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid visibility", () => {
      const result = AISkillSchema.safeParse({
        name: "TypeScript",
        level: "Expert",
        visibility: "private",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AIExperienceSchema", () => {
    it("should validate experience with optional endDate", () => {
      const result = AIExperienceSchema.safeParse({
        company: "Tech Corp",
        role: "Engineer",
        startDate: "2020-01",
        description: "Worked on...",
        visibility: "public",
      });
      expect(result.success).toBe(true);
    });

    it("should reject experience with empty company", () => {
      const result = AIExperienceSchema.safeParse({
        company: "",
        role: "Engineer",
        startDate: "2020-01",
        description: "Worked on...",
        visibility: "public",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AIContactSchema", () => {
    it("should validate valid contact", () => {
      const result = AIContactSchema.safeParse({
        email: { value: "test@example.com", visibility: "public" },
        phone: { value: "+1-555-0123", visibility: "masked" },
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = AIContactSchema.safeParse({
        email: { value: "not-an-email", visibility: "public" },
        phone: { value: "+1-555-0123", visibility: "public" },
      });
      expect(result.success).toBe(false);
    });

    it("should allow all visibility types", () => {
      const visibilities = ["public", "masked", "request"] as const;
      visibilities.forEach((vis) => {
        const result = AIContactSchema.safeParse({
          email: { value: "test@example.com", visibility: vis },
          phone: { value: "+1-555-0123", visibility: vis },
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("AIEducationSchema", () => {
    it("should validate education with optional description", () => {
      const result = AIEducationSchema.safeParse({
        institution: "MIT",
        degree: "B.S. Computer Science",
        startDate: "2012-09",
        endDate: "2016-05",
        visibility: "public",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("AIProjectSchema", () => {
    it("should validate valid project", () => {
      const result = AIProjectSchema.safeParse({
        name: "Open Source Project",
        description: "A library for...",
        visibility: "public",
      });
      expect(result.success).toBe(true);
    });

    it("should reject project with description over 1000 chars", () => {
      const result = AIProjectSchema.safeParse({
        name: "Project",
        description: "A".repeat(1001),
        visibility: "public",
      });
      expect(result.success).toBe(false);
    });
  });
});
