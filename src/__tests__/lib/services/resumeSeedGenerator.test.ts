import {
  categorizeProfession,
  getTemplateIdForCategory,
  generateTemplateResume,
} from "@/lib/services/resumeSeedGenerator";

describe("resumeSeedGenerator", () => {
  describe("categorizeProfession", () => {
    it("should categorize creative professions correctly", () => {
      expect(categorizeProfession("Graphic Designer")).toBe("creative");
      expect(categorizeProfession("Senior Artist")).toBe("creative");
      expect(categorizeProfession("Film Producer")).toBe("creative");
    });

    it("should categorize technical professions correctly", () => {
      expect(categorizeProfession("Software Engineer")).toBe("technical");
      expect(categorizeProfession("Data Scientist")).toBe("technical");
      expect(categorizeProfession("Product Manager")).toBe("executive");
    });

    it("should categorize executive professions correctly", () => {
      expect(categorizeProfession("Chief Executive Officer")).toBe("executive");
      expect(categorizeProfession("VP of Engineering")).toBe("executive");
      expect(categorizeProfession("Director of Sales")).toBe("executive");
    });

    it("should categorize unknown professions as general", () => {
      expect(categorizeProfession("Accountant")).toBe("general");
      expect(categorizeProfession("Teacher")).toBe("general");
      expect(categorizeProfession("")).toBe("general");
    });
  });

  describe("getTemplateIdForCategory", () => {
    it("should return correct template IDs", () => {
      expect(getTemplateIdForCategory("creative")).toBe("modern-creative-v1");
      expect(getTemplateIdForCategory("technical")).toBe("standard-v1");
      expect(getTemplateIdForCategory("executive")).toBe("executive-v1");
      expect(getTemplateIdForCategory("general")).toBe("standard-v1");
    });
  });

  describe("generateTemplateResume", () => {
    it("should generate a complete resume structure", () => {
      const resume = generateTemplateResume("Software Engineer");

      expect(resume).toHaveProperty("title", "Software Engineer");
      expect(resume).toHaveProperty("templateId", "standard-v1");
      expect(resume.skills.length).toBeGreaterThan(0);
      expect(resume.experience.length).toBe(2);
      expect(resume.education.length).toBe(1);
      expect(resume.projects.length).toBe(1);
      expect(resume.contact.email.value).toContain("software.engineer");
    });

    it("should generate consistent results for the same input", () => {
      const resume1 = generateTemplateResume("Product Designer");
      const resume2 = generateTemplateResume("Product Designer");

      expect(resume1).toEqual(resume2);
    });

    it("should generate different results for different inputs", () => {
      const resume1 = generateTemplateResume("Software Engineer");
      const resume2 = generateTemplateResume("Graphic Designer");

      expect(resume1.templateId).not.toBe(resume2.templateId);
      expect(resume1.skills).not.toEqual(resume2.skills);
    });

    it("should handle empty input gracefully", () => {
      const resume = generateTemplateResume("");
      expect(resume.title).toBe("Professional");
      expect(resume.templateId).toBe("standard-v1");
    });

    it("should limit skills to 6 items", () => {
      const resume = generateTemplateResume("Software Engineer");
      expect(resume.skills.length).toBeLessThanOrEqual(6);
    });

    it("should assign skill levels correctly", () => {
      const resume = generateTemplateResume("Software Engineer");
      const levels = resume.skills.map((s) => s.level);

      expect(levels).toContain("Expert");
      expect(levels).toContain("Advanced");
      // Intermediate might not be present if list is short, but let's check structure
      resume.skills.forEach((skill) => {
        expect(["Expert", "Advanced", "Intermediate"]).toContain(skill.level);
      });
    });
  });
});
