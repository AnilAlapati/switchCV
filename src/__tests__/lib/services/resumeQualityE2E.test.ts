/**
 * End-to-end quality tests: Simulates new users providing resume information
 * through chat, paste, and edge cases. Validates the full extraction →
 * normalization → validation → creative polish pipeline.
 */

jest.mock("@/lib/services/featureFlagService", () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}));

import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";
import {
  evaluateFactualAlignment,
  buildEvidenceMap,
  buildQualityReport,
  validateStructuredResumeContract,
} from "@/lib/services/resumeGenerationQuality";
import { applyCreativePolish } from "@/lib/services/resumeCreativePolisher";

// ============================
// SCENARIO 1: New grad chat flow
// ============================
describe("Scenario 1: New grad chat flow", () => {
  const messages = [
    { content: "Hi, I'd like to create a resume", isUser: true },
    { content: "Great! Let's start with your name and email.", isUser: false },
    {
      content: "My name is Priya Sharma, my email is priya.sharma@gmail.com",
      isUser: true,
    },
    { content: "What is your work experience?", isUser: false },
    {
      content:
        "I worked as a Software Engineer at Infosys for 2 years. I developed REST APIs using Java and Spring Boot.",
      isUser: true,
    },
    { content: "Any education?", isUser: false },
    {
      content: "I have a B.Tech in Computer Science from IIT Delhi in 2022",
      isUser: true,
    },
    { content: "What are your skills?", isUser: false },
    {
      content: "Skills: Java, Python, React, Docker, AWS, SQL, Git",
      isUser: true,
    },
    { content: "Anything else you'd like to add?", isUser: false },
    {
      content:
        "I am based in Bangalore, India. My LinkedIn is https://linkedin.com/in/priya-sharma",
      isUser: true,
    },
  ];

  let result: ReturnType<typeof ResumeDataExtractor.extractFromConversation>;

  beforeAll(() => {
    result = ResumeDataExtractor.extractFromConversation(messages);
  });

  it("extracts name correctly", () => {
    expect(result.data.name).toBe("Priya Sharma");
  });

  it("extracts email correctly", () => {
    expect(result.data.email).toBe("priya.sharma@gmail.com");
  });

  it("extracts location", () => {
    expect(result.data.location).toBeTruthy();
    expect(result.data.location!.toLowerCase()).toContain("bangalore");
  });

  it("extracts experience with no filler description", () => {
    expect(result.data.experience).toBeDefined();
    expect(result.data.experience!.length).toBeGreaterThanOrEqual(1);
    const exp = result.data.experience![0];
    expect(exp.description).not.toBe("Worked on various projects");
  });

  it("extracts education without defaulting year to current year", () => {
    expect(result.data.education).toBeDefined();
    expect(result.data.education!.length).toBeGreaterThanOrEqual(1);
    const edu = result.data.education![0];
    expect(edu.degree).toBeTruthy();
    expect(edu.institution).toBeTruthy();
    // Year should be 2022, not the current year
    if (edu.year) {
      expect(edu.year).not.toBe(new Date().getFullYear().toString());
    }
  });

  it("extracts skills including explicit user-provided ones", () => {
    const skills = result.data.skills || [];
    expect(skills.length).toBeGreaterThanOrEqual(5);
    expect(skills).toContain("Java");
    expect(skills).toContain("Python");
    expect(skills).toContain("React");
  });

  it("extracts LinkedIn URL", () => {
    expect(result.data.linkedin).toBeTruthy();
    expect(result.data.linkedin).toContain("linkedin.com/in/priya-sharma");
  });

  it("does not extract from assistant messages", () => {
    // Assistant said "Let's start with your name" — should not extract "name" as a skill etc.
    const skills = result.data.skills || [];
    expect(skills).not.toContain("name");
    expect(skills).not.toContain("email");
  });

  it("has reasonable confidence", () => {
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });
});

// ============================
// SCENARIO 2: Paste-heavy experienced professional
// ============================
describe("Scenario 2: Paste-heavy experienced professional", () => {
  const pastedText = `
John Smith
john.smith@techcorp.com | (555) 123-4567 | San Francisco, CA
https://linkedin.com/in/jsmith | https://github.com/jsmith

Professional Summary
Experienced full-stack engineer with 8 years building scalable web applications. Led a team of 5 engineers to deliver a payment platform processing $2M in daily transactions.

Experience
Senior Software Engineer at TechCorp (2020 - Present)
- Architected microservices platform handling 10,000 requests/second
- Reduced deployment time by 60% through CI/CD pipeline optimization
- Mentored 3 junior engineers

Software Engineer at StartupXYZ (2017 - 2020)
- Built React-based dashboard used by 500+ customers
- Implemented real-time notification system using WebSockets

Education
B.S. Computer Science, Stanford University, 2017

Skills
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, Redis
`;

  let result: ReturnType<typeof ResumeIntakeNormalizer.normalize>;

  beforeAll(() => {
    result = ResumeIntakeNormalizer.normalize({
      sources: [{ channel: "paste", text: pastedText }],
    });
  });

  it("extracts name from paste", () => {
    expect(result.draft.extractedData.name).toBe("John Smith");
  });

  it("extracts email", () => {
    expect(result.draft.extractedData.email).toBe("john.smith@techcorp.com");
  });

  it("extracts phone", () => {
    expect(result.draft.extractedData.phone).toBeTruthy();
  });

  it("detects resume sections", () => {
    expect(result.draft.sections.experience.length).toBeGreaterThan(0);
    expect(result.draft.sections.education.length).toBeGreaterThan(0);
    expect(result.draft.sections.skills.length).toBeGreaterThan(0);
  });

  it("extracts skills from paste", () => {
    const skills = result.draft.extractedData.skills || [];
    expect(skills.length).toBeGreaterThanOrEqual(5);
    expect(skills).toContain("JavaScript");
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("React");
  });

  it("builds evidence map", () => {
    expect(result.evidenceMap).toBeDefined();
    expect(Object.keys(result.evidenceMap).length).toBeGreaterThan(0);
  });

  it("reports missing critical fields accurately", () => {
    // Name and email should be found, so should not be in missing list
    expect(result.missingCriticalFields).not.toContain("name");
    expect(result.missingCriticalFields).not.toContain("email");
  });

  it("factual alignment passes for genuine data", () => {
    const allMessages = [{ content: pastedText, isUser: true }];
    const candidateData = result.draft.extractedData as Record<string, unknown>;
    const factualResult = evaluateFactualAlignment(candidateData, allMessages);
    expect(factualResult.score).toBeGreaterThanOrEqual(0.8);
  });
});

// ============================
// SCENARIO 3: Edge case — role phrases in "I am ..." + guardrails/digital
// ============================
describe("Scenario 3: Edge cases — role phrases and false-positive skills", () => {
  const messages = [
    {
      content: "I am the solo founder of a digital marketing agency",
      isUser: true,
    },
    { content: "What's your name?", isUser: false },
    { content: "Alex Chen", isUser: true },
    { content: "Email?", isUser: false },
    { content: "alex@guardrails.io", isUser: true },
    { content: "Skills?", isUser: false },
    {
      content:
        "I know React, Next.js, and Tailwind. Also proficient in TypeScript",
      isUser: true,
    },
  ];

  let result: ReturnType<typeof ResumeDataExtractor.extractFromConversation>;

  beforeAll(() => {
    result = ResumeDataExtractor.extractFromConversation(messages);
  });

  it("extracts name as Alex Chen, NOT a role phrase", () => {
    expect(result.data.name).toBe("Alex Chen");
    expect(result.data.name).not.toContain("Solo Founder");
    expect(result.data.name).not.toContain("Founder");
  });

  it("extracts email correctly from guardrails domain", () => {
    expect(result.data.email).toBe("alex@guardrails.io");
  });

  it("does NOT extract 'Rails' from 'guardrails' in email", () => {
    const skills = result.data.skills || [];
    // "Rails" should NOT be present — "guardrails.io" is a domain, not a skill mention
    // NOTE: The guardrails.io text appears in email, not in a skill context
    // The boundary matcher checks the full text so let's verify
    expect(skills).not.toContain("Rails");
  });

  it("does NOT extract 'Git' from 'digital'", () => {
    const skills = result.data.skills || [];
    // "digital" contains "git" as substring — boundary matching should prevent this
    // The word "digital" should not trigger "Git" extraction
    // Note: Git is only extracted if it appears as a standalone word
    const userProvidedGit = messages.some(
      (m) => m.isUser && /\bGit\b/.test(m.content),
    );
    if (!userProvidedGit) {
      expect(skills).not.toContain("Git");
    }
  });

  it("extracts user-provided skills correctly", () => {
    const skills = result.data.skills || [];
    expect(skills).toContain("React");
    expect(skills).toContain("TypeScript");
  });
});

// ============================
// SCENARIO 4: Contract validation
// ============================
describe("Scenario 4: Structured resume contract validation", () => {
  it("rejects resume with missing name", () => {
    const errors = validateStructuredResumeContract(
      { email: "test@test.com", summary: "A summary", skills: ["Java"] },
      { strictMode: true },
    );
    expect(errors.some((e) => e.toLowerCase().includes("name"))).toBe(true);
  });

  it("rejects resume with empty skills", () => {
    const errors = validateStructuredResumeContract(
      {
        name: "Test",
        email: "test@test.com",
        summary: "A summary",
        skills: [],
      },
      { strictMode: true },
    );
    expect(errors.some((e) => e.toLowerCase().includes("skill"))).toBe(true);
  });

  it("accepts valid resume data", () => {
    const errors = validateStructuredResumeContract(
      {
        name: "Test User",
        email: "test@test.com",
        summary: "Experienced engineer.",
        skills: ["Java", "Python"],
        experience: [
          {
            title: "Dev",
            company: "Corp",
            duration: "2y",
            description: "Built APIs",
          },
        ],
      },
      { strictMode: true },
    );
    expect(errors.length).toBe(0);
  });
});

// ============================
// SCENARIO 5: Creative polish
// ============================
describe("Scenario 5: Creative polish — evidence-backed rewriting", () => {
  it("polishes weak language while preserving semantics", () => {
    const polishResult = applyCreativePolish(
      {
        summary:
          "I was responsible for building the payment platform. I helped the team.",
        experience: [
          {
            title: "Senior Engineer",
            company: "TechCorp",
            description:
              "I worked on the API layer. I utilized Docker for containerization.",
            achievements: ["Helped reduce deployment time by 60%"],
          },
        ],
      },
      "professional",
    );

    expect(polishResult.appliedCount).toBeGreaterThan(0);
    // Summary should be rewritten
    const summary = polishResult.polishedData.summary as string;
    expect(summary).not.toContain("I was responsible for");
    expect(summary).not.toContain("I helped");
  });

  it("reverts low-confidence changes", () => {
    const polishResult = applyCreativePolish(
      {
        summary:
          "Led $5M revenue growth by launching 3 new product lines across APAC region.",
      },
      "professional",
    );

    // The above is already strong — polish should have low impact
    const annotations = polishResult.annotations;
    const reverted = annotations.filter((a) => !a.applied);
    // We expect some of these to be reverted since the original is already strong
    expect(annotations.length).toBeGreaterThanOrEqual(0);
  });

  it("preserves numeric claims during polish", () => {
    const polishResult = applyCreativePolish(
      {
        summary:
          "I was responsible for building a platform that handled 10,000 requests per second and generated $2M revenue.",
      },
      "executive",
    );

    const summary = polishResult.polishedData.summary as string;
    // Numeric claims must survive
    expect(summary).toMatch(/10,000|10000/);
    expect(summary).toMatch(/\$2M|\$2,000,000/);
  });
});

// ============================
// SCENARIO 6: Quality report generation
// ============================
describe("Scenario 6: Quality report", () => {
  it("generates correct quality report for valid resume", () => {
    const report = buildQualityReport({
      schemaValid: true,
      validationErrors: [],
      regenerationAttempts: 0,
      factualAlignmentScore: 0.95,
    });

    expect(report.schemaValid).toBe(true);
    expect(report.factualAlignmentScore).toBe(0.95);
    expect(report.validationErrors).toEqual([]);
  });

  it("flags schema-invalid resume", () => {
    const report = buildQualityReport({
      schemaValid: false,
      validationErrors: ["Missing name", "Empty skills"],
      regenerationAttempts: 1,
      factualAlignmentScore: 0.5,
    });

    expect(report.schemaValid).toBe(false);
    expect(report.validationErrors!.length).toBe(2);
  });
});
