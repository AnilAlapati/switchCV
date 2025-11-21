/**
 * Tests for config/resumeQuestions
 */

import { resumeQuestions } from "@/config/resumeQuestions";

describe("resumeQuestions Configuration", () => {
  it("should have questions array defined", () => {
    expect(resumeQuestions).toBeDefined();
    expect(Array.isArray(resumeQuestions)).toBe(true);
    expect(resumeQuestions.length).toBeGreaterThan(0);
  });

  it("should have all required question properties", () => {
    resumeQuestions.forEach((question) => {
      expect(question.id).toBeDefined();
      expect(typeof question.id).toBe("string");
      expect(question.question).toBeDefined();
      expect(typeof question.question).toBe("string");
      expect(question.type).toBeDefined();
      expect(["text", "textarea", "select", "multiselect"]).toContain(
        question.type
      );
      expect(question.required).toBeDefined();
      expect(typeof question.required).toBe("boolean");
      expect(question.category).toBeDefined();
      expect([
        "personal",
        "experience",
        "education",
        "skills",
        "projects",
        "summary",
        "preferences",
      ]).toContain(question.category);
    });
  });

  it("should have unique question IDs", () => {
    const ids = resumeQuestions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid question types", () => {
    const validTypes = ["text", "textarea", "select", "multiselect"];
    resumeQuestions.forEach((question) => {
      expect(validTypes).toContain(question.type);
    });
  });

  it("should have options for select/multiselect questions", () => {
    resumeQuestions.forEach((question) => {
      if (["select", "multiselect"].includes(question.type)) {
        expect(question.options).toBeDefined();
        expect(Array.isArray(question.options)).toBe(true);
        expect(question.options!.length).toBeGreaterThan(0);
      }
    });
  });

  it("should have no options for text/textarea questions", () => {
    resumeQuestions.forEach((question) => {
      if (["text", "textarea"].includes(question.type)) {
        if (question.options !== undefined) {
          expect(question.options.length).toBe(0);
        }
      }
    });
  });

  it("should have valid validation patterns if provided", () => {
    resumeQuestions.forEach((question) => {
      if (question.validation?.pattern) {
        expect(typeof question.validation.pattern).toBe("string");
        // Verify it's a valid regex pattern
        try {
          new RegExp(question.validation.pattern);
        } catch {
          fail(`Invalid regex pattern in question ${question.id}`);
        }
      }
    });
  });

  it("should have validation messages if pattern provided", () => {
    resumeQuestions.forEach((question) => {
      if (question.validation?.pattern) {
        expect(question.validation.message).toBeDefined();
        expect(typeof question.validation.message).toBe("string");
      }
    });
  });

  it("should have personal questions", () => {
    const personalQuestions = resumeQuestions.filter(
      (q) => q.category === "personal"
    );
    expect(personalQuestions.length).toBeGreaterThan(0);
  });

  it("should have experience questions", () => {
    const expQuestions = resumeQuestions.filter(
      (q) => q.category === "experience"
    );
    expect(expQuestions.length).toBeGreaterThan(0);
  });

  it("should have education questions", () => {
    const eduQuestions = resumeQuestions.filter(
      (q) => q.category === "education"
    );
    expect(eduQuestions.length).toBeGreaterThan(0);
  });

  it("should have skills questions", () => {
    const skillsQuestions = resumeQuestions.filter(
      (q) => q.category === "skills"
    );
    expect(skillsQuestions.length).toBeGreaterThan(0);
  });

  it("should have proper question text format", () => {
    resumeQuestions.forEach((question) => {
      expect(question.question.trim().length).toBeGreaterThan(0);
    });
  });

  it("should have followUp property when defined", () => {
    resumeQuestions.forEach((question) => {
      if (question.followUp !== undefined) {
        expect(Array.isArray(question.followUp)).toBe(true);
      }
    });
  });

  it("should validate placeholder only for text inputs", () => {
    resumeQuestions.forEach((question) => {
      if (
        question.placeholder !== undefined &&
        !["text", "textarea"].includes(question.type)
      ) {
        // Placeholders should be on text inputs primarily
        // but we allow them on other types too - just verify format
        expect(typeof question.placeholder).toBe("string");
      }
    });
  });

  it("should have required personal email and name", () => {
    const nameQuestion = resumeQuestions.find((q) => q.id === "personal_name");
    const emailQuestion = resumeQuestions.find(
      (q) => q.id === "personal_email"
    );

    expect(nameQuestion?.required).toBe(true);
    expect(emailQuestion?.required).toBe(true);
  });

  it("should have valid email validation pattern", () => {
    const emailQuestion = resumeQuestions.find(
      (q) => q.id === "personal_email"
    );
    expect(emailQuestion?.validation?.pattern).toBeDefined();

    const emailPattern = emailQuestion?.validation?.pattern || "";
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "first+last@example.com",
    ];

    validEmails.forEach((email) => {
      expect(new RegExp(emailPattern).test(email)).toBe(true);
    });
  });

  it("should not have duplicate questions across categories", () => {
    const allIds = resumeQuestions.map((q) => q.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("should have multiselect for skills when applicable", () => {
    const skillsQuestions = resumeQuestions.filter(
      (q) => q.category === "skills"
    );
    skillsQuestions.forEach((q) => {
      if (q.type === "multiselect" && q.options) {
        expect(q.options.length).toBeGreaterThan(0);
      }
    });
  });
});
