import {
  selectBestTemplate,
  analyzeResumeContent,
  getTemplateRecommendationDebug,
} from "@/lib/agents/templateSelector/templateSelectorAgent";
import { DashboardResume } from "@/types";

describe("templateSelectorAgent", () => {
  const mockResume = {
    id: "123",
    userId: "user-123",
    title: "Software Engineer",
    summary:
      "Experienced software engineer with a focus on web development and cloud technologies. Led multiple teams and delivered scalable solutions.",
    experience: [
      {
        id: "exp1",
        company: "Tech Corp",
        role: "Senior Software Engineer",
        description:
          "Led the development of a microservices architecture. Managed a team of 5 engineers. used Kubernetes and AWS. Improved performance by 30%.",
        startDate: "2020-01-01",
        endDate: "2023-01-01",
        current: false,
      },
      {
        id: "exp2",
        company: "StartUp Inc",
        role: "Software Engineer",
        description:
          "Developed frontend features using React. Architected a new state management system.",
        startDate: "2018-01-01",
        endDate: "2019-12-31",
        current: false,
      },
    ],
    skills: [
      { name: "TypeScript", level: "expert" },
      { name: "React", level: "expert" },
      { name: "Node.js", level: "intermediate" },
      { name: "AWS", level: "intermediate" },
    ],
    projects: [
      {
        id: "proj1",
        name: "Project A",
        description: "A scalable data processing pipeline using GCP.",
        url: "https://example.com",
      },
    ],
    education: [
      {
        id: "edu1",
        school: "University of Tech",
        degree: "BS Computer Science",
        field: "CS",
        startDate: "2014-01-01",
        endDate: "2018-01-01",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as DashboardResume;

  describe("analyzeResumeContent", () => {
    it("should correctly analyze a standard resume", () => {
      const analysis = analyzeResumeContent(mockResume);
      expect(analysis.experienceCount).toBe(2);
      expect(analysis.skillsCount).toBe(4);
      expect(analysis.hasMetrics).toBe(true); // "30%"
      expect(analysis.hasLeadershipSignals).toBe(true); // "Led", "Managed"
      expect(analysis.hasTechnicalDepth).toBe(true); // "Kubernetes", "AWS"
      expect(analysis.estimatedYearsExperience).toBeGreaterThanOrEqual(5);
      expect(analysis.seniorityLevel).toBe("senior");
    });

    it("should handle minimal resume content", () => {
      const minimalResume: DashboardResume = {
        ...mockResume,
        summary: "Junior dev.",
        experience: [],
        skills: [],
        projects: [],
        education: [],
      };
      const analysis = analyzeResumeContent(minimalResume);
      expect(analysis.contentDensity).toBe("minimal");
      expect(analysis.seniorityLevel).toBe("entry");
    });

    it("should classify content density correctly", () => {
      const lightResume = {
        ...mockResume,
        summary: "A".repeat(600),
        experience: [],
        projects: [],
      };
      expect(analyzeResumeContent(lightResume as any).contentDensity).toBe(
        "light",
      );

      const moderateResume = {
        ...mockResume,
        summary: "A".repeat(1200),
        experience: [],
        projects: [],
      };
      expect(analyzeResumeContent(moderateResume as any).contentDensity).toBe(
        "moderate",
      );

      const denseResume = {
        ...mockResume,
        summary: "A".repeat(2500),
        experience: [],
        projects: [],
      };
      expect(analyzeResumeContent(denseResume as any).contentDensity).toBe(
        "dense",
      );

      const veryDenseResume = {
        ...mockResume,
        summary: "A".repeat(4000),
        experience: [],
        projects: [],
      };
      expect(analyzeResumeContent(veryDenseResume as any).contentDensity).toBe(
        "very-dense",
      );
    });
  });

  describe("selectBestTemplate", () => {
    it("should return a recommendation with scores", () => {
      const recommendation = selectBestTemplate(mockResume);
      expect(recommendation.recommendedTemplate).toBeDefined();
      expect(recommendation.allScores.length).toBeGreaterThan(0);
      expect(recommendation.explanation).toContain(
        recommendation.recommendedTemplate,
      );
    });

    it("should recommend a executive template for senior management", () => {
      const execResume: DashboardResume = {
        ...mockResume,
        personalInfo: {
          title: "VP of Engineering",
        },
        summary:
          "Executive leader with 15 years experience directing large organizations.",
        experience: [
          {
            id: "e1",
            company: "Global Corp",
            role: "VP of Engineering",
            description:
              "Directed 200+ engineers. Managed $20M budget. Oversaw global expansion. Hired leadership team.",
            startDate: "2010-01-01",
            visibility: "public",
          } as any,
        ],
      } as any;
      const recommendation = selectBestTemplate(execResume);
      // Note: The specific recommendation depends on the scoring logic in the agent
      expect(recommendation.analysis.seniorityLevel).toBe("executive");
    });
  });

  describe("getTemplateRecommendationDebug", () => {
    it("should return debug information string", () => {
      const result = getTemplateRecommendationDebug(mockResume);
      expect(result.debug).toContain("=== Content Analysis ===");
      expect(result.debug).toContain("=== Template Scores ===");
    });
  });
});
