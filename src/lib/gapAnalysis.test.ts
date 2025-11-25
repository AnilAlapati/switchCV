/**
 * Gap Analysis Tests
 */

import {
  analyzeSkillGap,
  performGapAnalysis,
  compareJobFit,
} from "@/lib/gapAnalysis";

import {
  createSkill,
  initializeSkillInventory,
  addSkillToInventory,
} from "@/lib/skillInventory";

import {
  ProficiencyLevel,
  SkillCategory,
  JobPosting,
  JobRequirement,
} from "@/lib/skillMatrix.types";

describe("Gap Analysis Engine", () => {
  const userId = "test-user-123";

  describe("analyzeSkillGap", () => {
    it("should detect no gap when user meets requirement", () => {
      const requirement: JobRequirement = {
        skill: createSkill(
          "React",
          SkillCategory.TECHNICAL,
          ProficiencyLevel.ADVANCED
        ),
        importance: "must-have",
        minimumProficiency: ProficiencyLevel.ADVANCED,
      };

      const userSkill = createSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );

      const gap = analyzeSkillGap(requirement, userSkill);

      expect(gap.gap).toBe(0);
      expect(gap.gapDescription).toContain("Meet requirement");
    });

    it("should detect gap when user is below requirement", () => {
      const requirement: JobRequirement = {
        skill: createSkill(
          "Python",
          SkillCategory.TECHNICAL,
          ProficiencyLevel.ADVANCED
        ),
        importance: "must-have",
        minimumProficiency: ProficiencyLevel.ADVANCED,
      };

      const userSkill = createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      const gap = analyzeSkillGap(requirement, userSkill);

      expect(gap.gap).toBeGreaterThan(0);
      expect(gap.isCritical).toBe(true);
    });

    it("should mark gap as not critical for nice-to-have skills", () => {
      const requirement: JobRequirement = {
        skill: createSkill(
          "GraphQL",
          SkillCategory.TECHNICAL,
          ProficiencyLevel.INTERMEDIATE
        ),
        importance: "nice-to-have",
        minimumProficiency: ProficiencyLevel.INTERMEDIATE,
      };

      const userSkill = createSkill(
        "GraphQL",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );

      const gap = analyzeSkillGap(requirement, userSkill);

      expect(gap.isCritical).toBe(false);
    });

    it("should handle missing user skill", () => {
      const requirement: JobRequirement = {
        skill: createSkill(
          "Kubernetes",
          SkillCategory.TECHNICAL,
          ProficiencyLevel.INTERMEDIATE
        ),
        importance: "must-have",
        minimumProficiency: ProficiencyLevel.INTERMEDIATE,
      };

      const gap = analyzeSkillGap(requirement, undefined);

      expect(gap.userProficiency).toBeNull();
      expect(gap.gap).toBeGreaterThan(0);
      expect(gap.gapDescription).toContain("No experience");
    });
  });

  describe("performGapAnalysis", () => {
    it("should analyze complete job gap", () => {
      let inventory = initializeSkillInventory(userId);

      const reactSkill = createSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );
      const nodeSkill = createSkill(
        "Node.js",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, reactSkill);
      inventory = addSkillToInventory(inventory, nodeSkill);

      const jobPosting: JobPosting = {
        id: "job-123",
        title: "Full Stack Developer",
        description: "Looking for experienced full stack developer",
        requirements: [
          {
            skill: createSkill(
              "React",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.ADVANCED
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.ADVANCED,
          },
          {
            skill: createSkill(
              "Node.js",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.ADVANCED
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.ADVANCED,
          },
          {
            skill: createSkill(
              "TypeScript",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.INTERMEDIATE
            ),
            importance: "nice-to-have",
            minimumProficiency: ProficiencyLevel.INTERMEDIATE,
          },
        ],
      };

      const report = performGapAnalysis(inventory, jobPosting);

      expect(report.id).toBeDefined();
      expect(report.userId).toBe(userId);
      expect(report.jobPostingId).toBe("job-123");
      expect(report.skillGaps.length).toBe(3);
      expect(report.criticalGapsCount).toBeGreaterThan(0);
      expect(report.overallReadiness).toBeGreaterThan(0);
      expect(report.overallReadiness).toBeLessThanOrEqual(100);
    });

    it("should identify user strengths", () => {
      let inventory = initializeSkillInventory(userId);

      const expertSkill = createSkill(
        "JavaScript",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );

      inventory = addSkillToInventory(inventory, expertSkill);

      const jobPosting: JobPosting = {
        id: "job-456",
        title: "JavaScript Developer",
        description: "Need JavaScript expert",
        requirements: [
          {
            skill: createSkill(
              "JavaScript",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.ADVANCED
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.ADVANCED,
          },
        ],
      };

      const report = performGapAnalysis(inventory, jobPosting);

      expect(report.strengths.length).toBeGreaterThan(0);
      expect(report.strengths[0].name).toBe("JavaScript");
    });

    it("should generate learning recommendations", () => {
      let inventory = initializeSkillInventory(userId);

      const pythonSkill = createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );

      inventory = addSkillToInventory(inventory, pythonSkill);

      const jobPosting: JobPosting = {
        id: "job-789",
        title: "Data Scientist",
        description: "Data science position",
        requirements: [
          {
            skill: createSkill(
              "Python",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.EXPERT
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.EXPERT,
          },
        ],
      };

      const report = performGapAnalysis(inventory, jobPosting);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0].priority).toBe("high");
      expect(report.recommendations[0].resources.length).toBeGreaterThan(0);
    });

    it("should calculate time to readiness", () => {
      const inventory = initializeSkillInventory(userId);

      const jobPosting: JobPosting = {
        id: "job-1000",
        title: "Backend Engineer",
        description: "Backend development",
        requirements: [
          {
            skill: createSkill(
              "Go",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.ADVANCED
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.ADVANCED,
          },
        ],
      };

      const report = performGapAnalysis(inventory, jobPosting);

      expect(report.estimatedTimeToReady).toBeGreaterThan(0);
    });
  });

  describe("compareJobFit", () => {
    it("should rank jobs by fit", () => {
      let inventory = initializeSkillInventory(userId);

      const pythonSkill = createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );
      const javaSkill = createSkill(
        "Java",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );

      inventory = addSkillToInventory(inventory, pythonSkill);
      inventory = addSkillToInventory(inventory, javaSkill);

      const pythonJob: JobPosting = {
        id: "python-job",
        title: "Python Developer",
        description: "Need Python expert",
        requirements: [
          {
            skill: createSkill(
              "Python",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.EXPERT
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.EXPERT,
          },
        ],
      };

      const javaJob: JobPosting = {
        id: "java-job",
        title: "Java Developer",
        description: "Need Java expert",
        requirements: [
          {
            skill: createSkill(
              "Java",
              SkillCategory.TECHNICAL,
              ProficiencyLevel.EXPERT
            ),
            importance: "must-have",
            minimumProficiency: ProficiencyLevel.EXPERT,
          },
        ],
      };

      const results = compareJobFit(inventory, [javaJob, pythonJob]);

      expect(results.length).toBe(2);
      expect(results[0].job.id).toBe("python-job");
    });
  });
});
