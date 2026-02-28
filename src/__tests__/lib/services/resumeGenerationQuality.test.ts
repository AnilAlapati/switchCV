import {
  buildQualityReport,
  evaluateFactualAlignment,
  evaluateResumeV2Flags,
  validateStructuredResumeContract,
} from "@/lib/services/resumeGenerationQuality";
import { isFeatureEnabled } from "@/lib/services/featureFlagService";

jest.mock("@/lib/services/featureFlagService", () => ({
  isFeatureEnabled: jest.fn(),
}));

describe("resumeGenerationQuality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("evaluateFactualAlignment", () => {
    it("returns full score when no summary claims need verification", () => {
      const result = evaluateFactualAlignment(
        { summary: "Senior engineer focused on developer productivity." },
        [{ content: "I am a senior engineer.", isUser: true }],
      );

      expect(result.score).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.evaluatedClaims).toEqual([]);
    });

    it("flags unsupported numeric claims from summary", () => {
      const result = evaluateFactualAlignment(
        { summary: "Improved reliability by 40% and saved $200K annually." },
        [{ content: "I improved reliability and led migrations.", isUser: true }],
      );

      expect(result.score).toBe(0);
      expect(result.unsupportedSummaryMetricClaims).toEqual([
        "Improved reliability by 40% and saved $200K annually",
      ]);
      expect(result.errors[0]).toContain("Unverified summary metric claims");
    });

    it("supports claims when matching evidence exists in user input", () => {
      const result = evaluateFactualAlignment(
        { summary: "Improved latency by 35% and reduced cloud costs by $120,000." },
        [
          {
            content:
              "At Acme I improved latency by 35% and reduced cloud costs by $120,000.",
            isUser: true,
          },
        ],
      );

      expect(result.score).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.supportedClaims).toEqual([
        "Improved latency by 35% and reduced cloud costs by $120,000",
      ]);
    });

    it("flags unsupported scope and non-numeric assertions from experience bullets", () => {
      const result = evaluateFactualAlignment(
        {
          summary: "Experienced engineer with strong execution focus.",
          experience: [
            {
              title: "Engineering Manager",
              company: "Acme",
              description:
                "Led a global platform org and delivered a company-wide modernization roadmap.",
              achievements: [
                "Expert in multi-region distributed systems strategy",
              ],
            },
          ],
        },
        [
          {
            content: "I worked on backend APIs and internal tooling.",
            isUser: true,
          },
        ],
      );

      expect(result.score).toBeLessThan(1);
      expect(result.unsupportedScopeClaims).toEqual([
        "Led a global platform org and delivered a company-wide modernization roadmap",
      ]);
      expect(result.unsupportedNonNumericAssertions).toContain(
        "Experienced engineer with strong execution focus",
      );
      expect(result.unsupportedNonNumericAssertions).toContain(
        "Expert in multi-region distributed systems strategy",
      );
      expect(result.errors).toContain("Unverified scope claims: Led a global platform org and delivered a company-wide modernization roadmap");
      expect(
        result.errors.some((error) =>
          error.includes("Unverified non-numeric assertions"),
        ),
      ).toBe(true);
    });
  });

  describe("buildQualityReport", () => {
    it("includes explicit factual alignment score", () => {
      const report = buildQualityReport({
        schemaValid: true,
        validationErrors: [],
        regenerationAttempts: 1,
        factualAlignmentScore: 0.75,
      });

      expect(report).toEqual({
        schemaValid: true,
        factualAlignmentScore: 0.75,
        validationErrors: [],
        regenerationAttempts: 1,
      });
    });
  });

  describe("validateStructuredResumeContract", () => {
    it("returns schema errors for invalid strict payloads", () => {
      const errors = validateStructuredResumeContract(
        {
          name: "Jane Doe",
          email: "jane@example.com",
          summary: "Platform engineer.",
          skills: ["TypeScript", ""],
          experience: [
            {
              company: "",
              title: "Senior Engineer",
              description: "",
              achievements: [],
            },
          ],
          education: [{ institution: "State University", degree: "" }],
        },
        { strictMode: true },
      );

      expect(errors).toContain(
        "Skill at index 1 must be a non-empty string or object with name",
      );
      expect(errors).toContain("Experience entry 1 is missing company");
      expect(errors).toContain(
        "Experience entry 1 must include description or achievements",
      );
      expect(errors).toContain("Education entry 1 is missing degree");
    });

    it("passes strict contract for valid generated payloads", () => {
      const errors = validateStructuredResumeContract(
        {
          name: "Jane Doe",
          email: "jane@example.com",
          summary: "Senior engineer focused on platform reliability.",
          skills: ["TypeScript", { name: "Kubernetes" }],
          experience: [
            {
              company: "Acme",
              title: "Senior Engineer",
              description: "Built and maintained backend systems.",
              achievements: ["Reduced deployment incidents by 30%"],
            },
          ],
        },
        { strictMode: true },
      );

      expect(errors).toEqual([]);
    });
  });

  describe("evaluateResumeV2Flags", () => {
    it("falls back to defaults when flag evaluation fails", async () => {
      const mockIsFeatureEnabled = isFeatureEnabled as jest.MockedFunction<
        typeof isFeatureEnabled
      >;
      mockIsFeatureEnabled.mockRejectedValue(new Error("flag fetch failed"));

      const flags = await evaluateResumeV2Flags();

      expect(flags).toEqual({
        resume_v2_intake: true,
        resume_v2_writer: true,
        resume_v2_templates: false,
        resume_v2_strict_validation: true,
        resume_v2_creative_polish: false,
      });
    });
  });
});
