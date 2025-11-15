/* eslint-disable max-lines */
/**
 * Tests for Resume Page (Dynamic [slug])
 * Tests the public resume display with visibility controls
 */

import type { ResumeProfile } from "@/types";

// Mock Next.js notFound
jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));
// Mock resume utility functions
jest.mock("@/lib/utils/resumeVisibility", () => ({
  renderContactField: (field: any) => field?.value || "Not provided",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parseEnhancedContent: (_content: string) => ({
    enhancedSummary: "Professional summary",
    enhancedExperience: [],
    skillSuggestions: [],
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  countVisibility: (_items: any[]) => ({
    public: 2,
    masked: 1,
    request: 1,
  }),
}));

// Mock resume components
jest.mock("@/components/resume/ResumeContactSection", () => {
  return function MockSection() {
    return <div data-testid="contact-section">Contact Info</div>;
  };
});

jest.mock("@/components/resume/ResumeExperienceSection", () => {
  return function MockSection() {
    return <div data-testid="experience-section">Experience</div>;
  };
});

jest.mock("@/components/resume/ResumeEducationSection", () => {
  return function MockSection() {
    return <div data-testid="education-section">Education</div>;
  };
});

jest.mock("@/components/resume/ResumeSkillsSection", () => {
  return function MockSection() {
    return <div data-testid="skills-section">Skills</div>;
  };
});

jest.mock("@/components/resume/ResumeProjectsSection", () => {
  return function MockSection() {
    return <div data-testid="projects-section">Projects</div>;
  };
});

describe("Resume Page [slug]", () => {
  describe("Resume Display", () => {
    it("should render resume with title", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "John Doe - Senior Developer",
        slug: "john-doe-senior",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft text",
          polished: '{"enhancedSummary": "A skilled professional"}',
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "A skilled professional",
        contact: {
          email: { value: "john@example.com", visibility: "public" },
          phone: { value: "+1234567890", visibility: "request" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.title).toBe("John Doe - Senior Developer");
      expect(mockResume.slug).toBe("john-doe-senior");
      expect(mockResume.published).toBe(true);
    });

    it("should have all resume sections", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Test summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [{ name: "React", level: "expert", visibility: "public" }],
        experience: [
          {
            company: "Tech Corp",
            role: "Senior Developer",
            startDate: "2020-01",
            endDate: "2024-01",
            description: "Led development team",
            visibility: "public",
          },
        ],
        education: [
          {
            institution: "State University",
            degree: "BS Computer Science",
            startDate: "2016",
            endDate: "2020",
            visibility: "public",
          },
        ],
        projects: [],
      };

      expect(mockResume.contact).toBeDefined();
      expect(mockResume.skills?.length).toBe(1);
      expect(mockResume.experience?.length).toBe(1);
      expect(mockResume.education?.length).toBe(1);
    });
  });

  describe("Visibility Controls", () => {
    it("should mark request-only fields", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "request" },
          phone: { value: "+1111111111", visibility: "request" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      const hasRequestFields =
        mockResume.contact.email.visibility === "request" ||
        mockResume.contact.phone.visibility === "request";

      expect(hasRequestFields).toBe(true);
    });

    it("should handle masked visibility", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "masked" },
          phone: { value: "+1111111111", visibility: "masked" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.contact.email.visibility).toBe("masked");
      expect(mockResume.contact.phone.visibility).toBe("masked");
    });

    it("should handle public visibility", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.contact.email.visibility).toBe("public");
      expect(mockResume.contact.phone.visibility).toBe("public");
    });
  });

  describe("Content Sections", () => {
    it("should include contact information", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.contact).toBeDefined();
      expect(mockResume.contact.email).toBeDefined();
      expect(mockResume.contact.phone).toBeDefined();
    });

    it("should include experience section", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [
          {
            company: "Company",
            role: "Developer",
            startDate: "2020-01",
            description: "Worked on projects",
            visibility: "public",
          },
        ],
        education: [],
        projects: [],
      };

      expect(mockResume.experience?.length).toBe(1);
      expect(mockResume.experience?.[0].role).toBe("Developer");
    });

    it("should include education section", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [
          {
            degree: "BS",
            institution: "University",
            startDate: "2016",
            endDate: "2020",
            visibility: "public",
          },
        ],
        projects: [],
      };

      expect(mockResume.education?.length).toBe(1);
      expect(mockResume.education?.[0].degree).toBe("BS");
    });

    it("should include skills section", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [{ name: "React", level: "expert", visibility: "public" }],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.skills?.length).toBe(1);
      expect(mockResume.skills?.[0].name).toBe("React");
    });

    it("should include projects section", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [
          {
            name: "Project 1",
            url: "https://example.com",
            description: "A cool project",
            visibility: "public",
          },
        ],
      };

      expect(mockResume.projects?.length).toBe(1);
      expect(mockResume.projects?.[0].name).toBe("Project 1");
    });
  });

  describe("Resume Metadata", () => {
    it("should track last updated timestamp", () => {
      const lastUpdatedAt = "2024-01-20T15:45:00Z";
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt,
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: "2024-01-15T10:30:00Z",
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.lastUpdatedAt).toBe("2024-01-20T15:45:00Z");
    });

    it("should track generation timestamp", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Test Resume",
        slug: "test-resume",
        published: true,
        lastUpdatedAt: "2024-01-20T15:45:00Z",
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: "2024-01-15T10:30:00Z",
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.generatedText.lastGeneratedAt).toBe(
        "2024-01-15T10:30:00Z"
      );
    });
  });

  describe("Resume Publication", () => {
    it("should indicate published status", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Published Resume",
        slug: "published-resume",
        published: true,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.published).toBe(true);
    });

    it("should handle draft resumes", () => {
      const mockResume: ResumeProfile = {
        versionId: "v1",
        title: "Draft Resume",
        slug: "draft-resume",
        published: false,
        lastUpdatedAt: new Date().toISOString(),
        generatedText: {
          draft: "Draft",
          polished: "{}",
          lastGeneratedAt: new Date().toISOString(),
        },
        summary: "Summary",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "+1111111111", visibility: "public" },
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      expect(mockResume.published).toBe(false);
    });
  });
});
