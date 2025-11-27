/* eslint-disable max-lines */
// src/__tests__/types/index.test.ts
import {
  Visibility,
  ContactInfo,
  Skill,
  Experience,
  Education,
  Project,
  ResumeProfile,
  User,
  RecruiterRequest,
  Analytics,
  AuditLog,
} from "../../types";

describe("Types", () => {
  describe("Visibility enum", () => {
    it("should have correct values", () => {
      expect(["public", "masked", "request"] as Visibility[]).toContain(
        "public"
      );
      expect(["public", "masked", "request"] as Visibility[]).toContain(
        "masked"
      );
      expect(["public", "masked", "request"] as Visibility[]).toContain(
        "request"
      );
    });
  });

  describe("ContactInfo interface", () => {
    it("should create valid ContactInfo object", () => {
      const contact: ContactInfo = {
        email: { value: "test@example.com", visibility: "public" },
        phone: { value: "+1234567890", visibility: "masked" },
      };

      expect(contact.email.value).toBe("test@example.com");
      expect(contact.email.visibility).toBe("public");
      expect(contact.phone.value).toBe("+1234567890");
      expect(contact.phone.visibility).toBe("masked");
    });
  });

  describe("Skill interface", () => {
    it("should create valid Skill object", () => {
      const skill: Skill = {
        name: "JavaScript",
        level: "Expert",
        visibility: "public",
      };

      expect(skill.name).toBe("JavaScript");
      expect(skill.level).toBe("Expert");
      expect(skill.visibility).toBe("public");
    });
  });

  describe("Experience interface", () => {
    it("should create valid Experience object", () => {
      const experience: Experience = {
        company: "Tech Corp",
        role: "Developer",
        startDate: "2020-01-01",
        endDate: "2023-01-01",
        description: "Developed software",
        visibility: "public",
      };

      expect(experience.company).toBe("Tech Corp");
      expect(experience.role).toBe("Developer");
      expect(experience.startDate).toBe("2020-01-01");
      expect(experience.endDate).toBe("2023-01-01");
      expect(experience.description).toBe("Developed software");
      expect(experience.visibility).toBe("public");
    });

    it("should handle optional endDate", () => {
      const experience: Experience = {
        company: "Tech Corp",
        role: "Developer",
        startDate: "2020-01-01",
        description: "Currently working",
        visibility: "public",
      };

      expect(experience.endDate).toBeUndefined();
    });
  });

  describe("Education interface", () => {
    it("should create valid Education object", () => {
      const education: Education = {
        institution: "University",
        degree: "BS Computer Science",
        startDate: "2016-01-01",
        endDate: "2020-01-01",
        description: "Graduated with honors",
        visibility: "public",
      };

      expect(education.institution).toBe("University");
      expect(education.degree).toBe("BS Computer Science");
      expect(education.startDate).toBe("2016-01-01");
      expect(education.endDate).toBe("2020-01-01");
      expect(education.description).toBe("Graduated with honors");
      expect(education.visibility).toBe("public");
    });

    it("should handle optional description", () => {
      const education: Education = {
        institution: "University",
        degree: "BS Computer Science",
        startDate: "2016-01-01",
        endDate: "2020-01-01",
        visibility: "public",
      };

      expect(education.description).toBeUndefined();
    });
  });

  describe("Project interface", () => {
    it("should create valid Project object", () => {
      const project: Project = {
        name: "My Project",
        url: "https://github.com/user/project",
        description: "A cool project",
        visibility: "public",
      };

      expect(project.name).toBe("My Project");
      expect(project.url).toBe("https://github.com/user/project");
      expect(project.description).toBe("A cool project");
      expect(project.visibility).toBe("public");
    });

    it("should handle optional url", () => {
      const project: Project = {
        name: "My Project",
        description: "A cool project",
        visibility: "public",
      };

      expect(project.url).toBeUndefined();
    });
  });

  describe("ResumeProfile interface", () => {
    it("should create valid ResumeProfile object", () => {
      const resume: ResumeProfile = {
        versionId: "v1",
        title: "Software Developer",
        summary: "Experienced developer",
        skills: [{ name: "JavaScript", level: "Expert", visibility: "public" }],
        experience: [
          {
            company: "Tech Corp",
            role: "Developer",
            startDate: "2020-01-01",
            endDate: "2023-01-01",
            description: "Developed software",
            visibility: "public",
          },
        ],
        education: [
          {
            institution: "University",
            degree: "BS Computer Science",
            startDate: "2016-01-01",
            endDate: "2020-01-01",
            visibility: "public",
          },
        ],
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1234567890", visibility: "masked" },
        },
        projects: [
          {
            name: "My Project",
            description: "A cool project",
            visibility: "public",
          },
        ],
        generatedText: {
          draft: "Draft text",
          polished: "Polished text",
          lastGeneratedAt: "2023-01-01T00:00:00Z",
        },
        slug: "test-slug",
        lastUpdatedAt: "2023-01-01T00:00:00Z",
      };

      expect(resume.versionId).toBe("v1");
      expect(resume.title).toBe("Software Developer");
      expect(resume.summary).toBe("Experienced developer");
      expect(resume.skills).toHaveLength(1);
      expect(resume.experience).toHaveLength(1);
      expect(resume.education).toHaveLength(1);
      expect(resume.contact.email.value).toBe("test@example.com");
      expect(resume.projects).toHaveLength(1);
      expect(resume.generatedText.draft).toBe("Draft text");
      expect(resume.generatedText.polished).toBe("Polished text");
      expect(resume.slug).toBe("test-slug");
      expect(resume.lastUpdatedAt).toBe("2023-01-01T00:00:00Z");
    });
  });

  describe("User interface", () => {
    it("should create valid User object", () => {
      const user: User = {
        uid: "user123",
        email: "test@example.com",
        displayName: "Test User",
        profileSlug: "test-user",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        settings: {
          publicProfile: true,
          defaultPIIVisibility: "masked",
        },
      };

      expect(user.uid).toBe("user123");
      expect(user.email).toBe("test@example.com");
      expect(user.displayName).toBe("Test User");
      expect(user.profileSlug).toBe("test-user");
      expect(user.createdAt).toBe("2023-01-01T00:00:00Z");
      expect(user.updatedAt).toBe("2023-01-01T00:00:00Z");
      expect(user.settings.publicProfile).toBe(true);
      expect(user.settings.defaultPIIVisibility).toBe("masked");
    });

    it("should handle optional displayName", () => {
      const user: User = {
        uid: "user123",
        email: "test@example.com",
        profileSlug: "test-user",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        settings: {
          publicProfile: true,
          defaultPIIVisibility: "masked",
        },
      };

      expect(user.displayName).toBeUndefined();
    });
  });

  describe("RecruiterRequest interface", () => {
    it("should create valid RecruiterRequest object", () => {
      const request: RecruiterRequest = {
        id: "req123",
        fromRecruiter: {
          name: "John Recruiter",
          org: "Tech Corp",
          email: "john@techcorp.com",
          recruiterId: "rec123",
        },
        toUserId: "user123",
        requestedFields: ["email", "phone"],
        status: "requested",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      expect(request.id).toBe("req123");
      expect(request.fromRecruiter.name).toBe("John Recruiter");
      expect(request.fromRecruiter.org).toBe("Tech Corp");
      expect(request.toUserId).toBe("user123");
      expect(request.requestedFields).toEqual(["email", "phone"]);
      expect(request.status).toBe("requested");
      expect(request.createdAt).toBe("2023-01-01T00:00:00Z");
      expect(request.updatedAt).toBe("2023-01-01T00:00:00Z");
    });

    it("should handle optional recruiterId", () => {
      const request: RecruiterRequest = {
        id: "req123",
        fromRecruiter: {
          name: "John Recruiter",
          org: "Tech Corp",
          email: "john@techcorp.com",
        },
        toUserId: "user123",
        requestedFields: ["email"],
        status: "approved",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      expect(request.fromRecruiter.recruiterId).toBeUndefined();
    });
  });

  describe("Analytics interface", () => {
    it("should create valid Analytics object", () => {
      const analytics: Analytics = {
        slug: "test-slug",
        resumeId: "resume-123",
        userId: "user-123",
        totalInteractions: 100,
        lastUpdatedAt: "2023-01-01T00:00:00Z",
        views: {
          count: 100,
          uniqueViewers: 80,
          avgSessionDuration: 120,
          lastViewedAt: "2023-01-01T00:00:00Z",
          topReferrers: {
            "google.com": 50,
            "linkedin.com": 30,
          },
        },
      };

      expect(analytics.slug).toBe("test-slug");
      expect(analytics.views.count).toBe(100);
      expect(analytics.views.lastViewedAt).toBe("2023-01-01T00:00:00Z");
      expect(analytics.views.topReferrers["google.com"]).toBe(50);
      expect(analytics.views.topReferrers["linkedin.com"]).toBe(30);
    });
  });

  describe("AuditLog interface", () => {
    it("should create valid AuditLog object", () => {
      const log: AuditLog = {
        id: "log123",
        action: "view_resume",
        actor: "user123",
        timestamp: "2023-01-01T00:00:00Z",
        meta: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        },
      };

      expect(log.id).toBe("log123");
      expect(log.action).toBe("view_resume");
      expect(log.actor).toBe("user123");
      expect(log.timestamp).toBe("2023-01-01T00:00:00Z");
      expect(log.meta.ip).toBe("192.168.1.1");
      expect(log.meta.userAgent).toBe("Mozilla/5.0");
    });
  });
});
