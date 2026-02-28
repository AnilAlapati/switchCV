import {
  evaluateCreativePolishGate,
  evaluateLaunchGate,
} from "@/lib/services/resumeEvaluationHarness";

describe("resumeEvaluationHarness", () => {
  describe("evaluateLaunchGate", () => {
    it("passes when launch KPIs are met", () => {
      const cases = Array.from({ length: 20 }, (_, index) => ({
        id: `case-${index}`,
        parseSucceeded: true,
        reviewerScore: 4.8,
        regenerationAttempts: 1,
        userEdited: false,
        evidenceMessages: [
          {
            content:
              "Improved latency by 35% and reduced cloud costs by $120,000.",
            isUser: true as const,
          },
        ],
        resumeData: {
          name: "Jane Doe",
          email: "jane@example.com",
          summary:
            "Improved latency by 35% and reduced cloud costs by $120,000.",
          skills: ["TypeScript"],
          experience: [
            {
              company: "Acme",
              title: "Engineer",
              description: "Built distributed systems.",
            },
          ],
        },
      }));

      const summary = evaluateLaunchGate(cases);

      expect(summary.passed).toBe(true);
      expect(summary.schemaValidRate).toBe(100);
      expect(summary.factualAlignmentScore).toBe(100);
    });

    it("fails when schema and factual thresholds are not met", () => {
      const summary = evaluateLaunchGate([
        {
          id: "bad-1",
          parseSucceeded: false,
          reviewerScore: 3.5,
          evidenceMessages: [{ content: "Did migrations.", isUser: true }],
          resumeData: {
            name: "",
            email: "bad-email",
            summary: "Increased revenue by 50%",
            skills: [],
            experience: [],
            education: [],
          },
        },
      ]);

      expect(summary.passed).toBe(false);
      expect(summary.failures.length).toBeGreaterThan(0);
      expect(summary.failures.join(" | ")).toContain("schema_valid_rate");
      expect(summary.failures.join(" | ")).toContain("factual_alignment_score");
    });
  });

  describe("evaluateCreativePolishGate", () => {
    it("fails when sample size is below minimum", () => {
      const summary = evaluateCreativePolishGate([
        {
          id: "c-1",
          reviewerScore: 4.9,
          baselineRegenerationAttempts: 1,
          polishedRegenerationAttempts: 1,
          fabricatedClaimsCount: 0,
          evidenceMessages: [{ content: "Built APIs.", isUser: true }],
          factualResume: {
            summary: "Built APIs.",
          },
          polishedResume: {
            summary: "Built APIs.",
          },
        },
      ]);

      expect(summary.passed).toBe(false);
      expect(summary.failures.join(" | ")).toContain("minimum 50 required");
    });

    it("fails when unsupported claims appear in polished output", () => {
      const cases = Array.from({ length: 50 }, (_, index) => ({
        id: `c-${index}`,
        reviewerScore: 4.7,
        baselineRegenerationAttempts: 1,
        polishedRegenerationAttempts: 1,
        fabricatedClaimsCount: 0,
        evidenceMessages: [{ content: "Built APIs.", isUser: true as const }],
        factualResume: {
          summary: "Built APIs.",
        },
        polishedResume: {
          summary: "Increased revenue by 80%.",
        },
      }));

      const summary = evaluateCreativePolishGate(cases);
      expect(summary.passed).toBe(false);
      expect(summary.fabricatedOrUnsupportedClaims).toBeGreaterThan(0);
    });
  });
});
