/**
 * aiExtractionService — 10-Scenario Quality Test Suite
 *
 * PURPOSE: Validate that the extraction pipeline correctly parses realistic,
 * diverse conversation transcripts through the full path:
 *   transcript → generateTextWithTier (mocked) → safeParseJSON →
 *   Zod validation → mapExtractionToRequirements → output
 *
 * These tests guard against:
 *   1. Parsing regressions (safeParseJSON, Zod schema changes)
 *   2. Mapping regressions (mapExtractionToRequirements dropping fields)
 *   3. Model selection drift (should always call gemini-2.5-pro / enterprise)
 *   4. Guard conditions (empty input, skipAI flag)
 *   5. False-positive filtering (skills-as-experience, location from email)
 *
 * To add a new scenario: add a describe block following the same pattern.
 *
 * @module __tests__/lib/services/aiExtractionService.scenarios
 */

// ============================================================================
// MOCKS — must be hoisted before any imports
// ============================================================================

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

jest.mock("@/lib/services/aiMonitoringService", () => ({
  classifyAIFailure: jest.fn(() => ({
    failureCode: "AI_SCHEMA_VALIDATION_FAILED",
    errorMessage: "Test classification",
  })),
  markAIStageFailed: jest.fn(),
  persistAIFailureEvent: jest.fn().mockResolvedValue("event-id"),
}));

// generateTextWithTier is dynamically imported inside extractWithStructuredOutput.
// Jest intercepts dynamic imports via the same module registry as static imports,
// so this mock is picked up at runtime.
const mockGenerateTextWithTier = jest.fn();
jest.mock("@/server/services/aiProviderService", () => ({
  generateTextWithTier: (...args: unknown[]) =>
    mockGenerateTextWithTier(...args),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import {
  extractWithStructuredOutput,
  resetFailureTracker,
} from "@/lib/services/aiExtractionService";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Wrap a JSON object as a mock AI response object (mirrors the shape of
 * what generateTextWithTier returns in production).
 */
function aiResponse(data: object): {
  text: string;
  model: string;
  provider: string;
} {
  return {
    text: JSON.stringify(data),
    model: "gemini-2.5-pro",
    provider: "google",
  };
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  resetFailureTracker();
});

// ============================================================================
// SCENARIO 1: Senior US Software Engineer — multi-company history
// Mirrors the original bug report: IBM → TEKsystems → JPMC progression
// ============================================================================

describe("Scenario 1: Senior US Software Engineer — multi-company career", () => {
  const transcript = `
    User: Hi, I'm Anil Alapati. Email is anilalapati@gmail.com, phone 415-555-0100.
    Bot: Great, tell me about your work history.
    User: Sure. I started at IBM as a Software Engineer from 2018 to 2020.
    Then TEKsystems for two years as a Senior Developer: 2020 to 2022.
    Currently at JPMC since 2022 as a SWE3 / Team Lead.
    Bot: What about skills?
    User: Java, Spring Boot, React, AWS, Kubernetes, SQL, Python.
  `;

  it("extracts name, email, phone and all 3 experience entries", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Anil Alapati",
        email: "anilalapati@gmail.com",
        phone: "415-555-0100",
        experience: [
          {
            title: "Software Engineer",
            company: "IBM",
            duration: "2018 - 2020",
            description: "Software engineering at IBM.",
          },
          {
            title: "Senior Developer",
            company: "TEKsystems",
            duration: "2020 - 2022",
            description: "Senior development work at TEKsystems.",
          },
          {
            title: "SWE3 / Team Lead",
            company: "JPMC",
            duration: "2022 - Present",
            description: "Current role at JPMC leading a software team.",
          },
        ],
        skills: [
          "Java",
          "Spring Boot",
          "React",
          "AWS",
          "Kubernetes",
          "SQL",
          "Python",
        ],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data!.name).toBe("Anil Alapati");
    expect(result.data!.email).toBe("anilalapati@gmail.com");
    expect(result.data!.phone).toBe("415-555-0100");
    expect(result.data!.experience).toHaveLength(3);
    expect(result.data!.experience![0].company).toBe("IBM");
    expect(result.data!.experience![1].company).toBe("TEKsystems");
    expect(result.data!.experience![2].company).toBe("JPMC");
    expect(result.data!.skills).toContain("Java");
    expect(result.data!.skills).toContain("AWS");
    expect(result.method).toBe("ai");
    // The actual model used must be surfaced in the return value
    expect(result.model).toBe("gemini-2.5-pro");
  });

  it("calls generateTextWithTier with modelId=gemini-2.5-pro and userTier=enterprise", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({ name: "Anil Alapati" }),
    );

    await extractWithStructuredOutput(transcript);

    expect(mockGenerateTextWithTier).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "gemini-2.5-pro",
        userTier: "enterprise",
      }),
    );
  });

  it("logs a warning and still returns data when a fallback model was used", async () => {
    // Simulate circuit breaker firing: provider returned a different model
    mockGenerateTextWithTier.mockResolvedValue({
      text: JSON.stringify({ name: "Anil Alapati" }),
      model: "gemini-2.0-flash", // not the pinned model
      provider: "google",
    });
    const { logger } = jest.requireMock("@/lib/logger");

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.model).toBe("gemini-2.0-flash"); // actual model surfaced
    // Warning must have been logged so we can detect drift in production logs
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedModel: "gemini-2.5-pro",
        actualModel: "gemini-2.0-flash",
      }),
      expect.stringContaining("fallback model"),
    );
  });
});

// ============================================================================
// SCENARIO 2: Indian Engineering Graduate — CGPA grading format
// Tests international education formats (CGPA on 10.0 scale)
// ============================================================================

describe("Scenario 2: Indian Engineering Graduate — CGPA grading", () => {
  const transcript = `
    User: My name is Priya Sharma, priya.sharma@outlook.com.
    I completed B.Tech in Computer Science from IIT Bombay in 2023 with CGPA 9.2 out of 10.
    I also did my 12th from Delhi Public School with 94.6%.
    Bot: Any work experience?
    User: I have a 6-month internship at Infosys as a Software Intern from Jan to June 2023.
    Bot: Skills?
    User: Python, TensorFlow, PyTorch, Java, Data Structures, Algorithms.
  `;

  it("extracts CGPA for B.Tech and percentage for 12th", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Priya Sharma",
        email: "priya.sharma@outlook.com",
        education: [
          {
            degree: "B.Tech Computer Science",
            institution: "IIT Bombay",
            year: "2023",
            major: "Computer Science",
            gpa: "9.2/10 CGPA",
          },
          {
            degree: "12th Standard",
            institution: "Delhi Public School",
            year: "2019",
            gpa: "94.6%",
          },
        ],
        experience: [
          {
            title: "Software Intern",
            company: "Infosys",
            duration: "Jan 2023 - Jun 2023",
            description: "6-month internship at Infosys.",
          },
        ],
        skills: [
          "Python",
          "TensorFlow",
          "PyTorch",
          "Java",
          "Data Structures",
          "Algorithms",
        ],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.data!.education).toHaveLength(2);
    expect(result.data!.education![0].gpa).toBe("9.2/10 CGPA");
    expect(result.data!.education![1].gpa).toBe("94.6%");
    expect(result.data!.experience![0].company).toBe("Infosys");
    expect(result.data!.skills).toContain("TensorFlow");
  });
});

// ============================================================================
// SCENARIO 3: Career Changer — Teacher → Software Developer
// Tests multi-domain experience across non-tech and tech roles
// ============================================================================

describe("Scenario 3: Career Changer — Teacher to Software Developer", () => {
  const transcript = `
    User: I'm Marcus Williams, marcus.w@gmail.com.
    Before coding I taught high school math for 5 years at Lincoln High School (2016-2021).
    Now I'm a Junior Software Developer at CodeCraft Inc since 2022.
    I'm also finishing a part-time B.Sc in Computer Science at City College, graduating 2025.
    Skills: JavaScript, React, Node.js, Python, SQL.
  `;

  it("extracts both teaching and dev experience entries", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Marcus Williams",
        email: "marcus.w@gmail.com",
        experience: [
          {
            title: "High School Math Teacher",
            company: "Lincoln High School",
            duration: "2016 - 2021",
            description: "Taught high school mathematics for 5 years.",
          },
          {
            title: "Junior Software Developer",
            company: "CodeCraft Inc",
            duration: "2022 - Present",
            description: "Junior software development role at CodeCraft.",
          },
        ],
        education: [
          {
            degree: "B.Sc Computer Science",
            institution: "City College",
            year: "2025",
          },
        ],
        skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.data!.experience).toHaveLength(2);
    const companies = result.data!.experience!.map((e) => e.company);
    expect(companies).toContain("Lincoln High School");
    expect(companies).toContain("CodeCraft Inc");
    expect(result.data!.education![0].degree).toContain("Computer Science");
    expect(result.data!.skills).toContain("React");
  });
});

// ============================================================================
// SCENARIO 4: Bulk-pasted LinkedIn / resume text
// Tests well-formatted, dense pasted content with clear structure
// ============================================================================

describe("Scenario 4: Bulk-pasted LinkedIn-style resume text", () => {
  const transcript = `
    SARAH CHEN | sarah.chen@techco.com | +1-650-555-0199 | San Francisco, CA
    LinkedIn: linkedin.com/in/sarahchen | GitHub: github.com/sarahchen

    SUMMARY
    Staff engineer with 10+ years building distributed systems. Led 15-engineer team.

    EXPERIENCE
    Staff Software Engineer — Pinterest | 2020 – Present
    - Designed real-time recommendation engine serving 500M+ monthly users
    - Reduced P99 latency by 40% through async processing redesign

    Senior Engineer — Twitter | 2016 – 2020
    - Built tweet indexing pipeline handling 500K tweets/minute

    EDUCATION
    M.S. Computer Science — Stanford University | 2014

    SKILLS
    Go, Python, Rust, Kafka, Spark, Flink, PostgreSQL, Redis
  `;

  it("extracts contact, summary, experience, education, skills from bulk paste", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Sarah Chen",
        email: "sarah.chen@techco.com",
        phone: "+1-650-555-0199",
        location: "San Francisco, CA",
        linkedin: "linkedin.com/in/sarahchen",
        github: "github.com/sarahchen",
        summary:
          "Staff engineer with 10+ years building distributed systems. Led 15-engineer team.",
        experience: [
          {
            title: "Staff Software Engineer",
            company: "Pinterest",
            duration: "2020 - Present",
            description: "Designed real-time recommendation engine.",
            achievements: [
              "Served 500M+ monthly users",
              "Reduced P99 latency by 40%",
            ],
          },
          {
            title: "Senior Engineer",
            company: "Twitter",
            duration: "2016 - 2020",
            description: "Built tweet indexing pipeline.",
          },
        ],
        education: [
          {
            degree: "M.S. Computer Science",
            institution: "Stanford University",
            year: "2014",
          },
        ],
        skills: [
          "Go",
          "Python",
          "Rust",
          "Kafka",
          "Spark",
          "Flink",
          "PostgreSQL",
          "Redis",
        ],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    const data = result.data!;
    expect(data.name).toBe("Sarah Chen");
    expect(data.location).toBe("San Francisco, CA");
    expect(data.linkedin).toBe("linkedin.com/in/sarahchen");
    expect(data.github).toBe("github.com/sarahchen");
    expect(data.summary).toContain("Staff engineer");
    expect(data.experience).toHaveLength(2);
    expect(data.experience![0].achievements).toHaveLength(2);
    expect(data.education![0].institution).toBe("Stanford University");
    expect(data.skills).toContain("Kafka");
  });
});

// ============================================================================
// SCENARIO 5: Casual / informal conversational language
// Tests that informal phrasing ("like", "about", "stuff") is handled
// ============================================================================

describe("Scenario 5: Casual informal chat — slangy language", () => {
  const transcript = `
    Bot: Tell me about your work experience.
    User: ok so like, i've been at Google for about 3 years now, mostly backend stuff ya know
    i do like infra and distributed systems, before that i was at Netflix for like 2 years
    doing streaming infra and recommendation stuff
    Bot: Cool! Email?
    User: jordan.dev.99@gmail.com
    Bot: Name?
    User: Jordan Park, I guess Jordan is fine
  `;

  it("extracts companies from informal phrasing without hallucinating extras", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Jordan Park",
        email: "jordan.dev.99@gmail.com",
        experience: [
          {
            title: "Software Engineer",
            company: "Google",
            duration: "3 years",
            description: "Backend infrastructure and distributed systems.",
          },
          {
            title: "Software Engineer",
            company: "Netflix",
            duration: "2 years",
            description: "Streaming infrastructure and recommendation systems.",
          },
        ],
        skills: ["Backend", "Infrastructure", "Distributed Systems"],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("Jordan Park");
    expect(result.data!.email).toBe("jordan.dev.99@gmail.com");
    const companies = result.data!.experience!.map((e) => e.company);
    expect(companies).toContain("Google");
    expect(companies).toContain("Netflix");
    expect(companies).toHaveLength(2); // no hallucinated extras
  });
});

// ============================================================================
// SCENARIO 6: Freelancer with overlapping full-time + contract work
// Tests that both employment types are captured
// ============================================================================

describe("Scenario 6: Freelancer with parallel contract and full-time work", () => {
  const transcript = `
    User: I'm Elena Vasquez, elena@freelancedev.io.
    I work full-time at Shopify as a Senior Developer (2021 - present).
    On the side I do freelance iOS consulting since 2019, clients include DoorDash
    and Lyft on short-term contracts.
    Education: B.Eng Software Engineering at University of Toronto, 2019.
    Skills: Swift, Kotlin, React Native, iOS, Android, Node.js.
  `;

  it("captures both the full-time role and freelance contract work", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Elena Vasquez",
        email: "elena@freelancedev.io",
        experience: [
          {
            title: "Senior Developer",
            company: "Shopify",
            duration: "2021 - Present",
            description: "Full-time senior development at Shopify.",
          },
          {
            title: "Freelance iOS Consultant",
            company: "Self-employed",
            duration: "2019 - Present",
            description:
              "Freelance iOS consulting for DoorDash, Lyft and other clients.",
          },
        ],
        education: [
          {
            degree: "B.Eng Software Engineering",
            institution: "University of Toronto",
            year: "2019",
          },
        ],
        skills: [
          "Swift",
          "Kotlin",
          "React Native",
          "iOS",
          "Android",
          "Node.js",
        ],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    const companies = result.data!.experience!.map((e) => e.company);
    expect(companies).toContain("Shopify");
    expect(
      companies.some(
        (c) =>
          c.toLowerCase().includes("self") ||
          c.toLowerCase().includes("freelance") ||
          c.toLowerCase().includes("employed"),
      ),
    ).toBe(true);
    expect(result.data!.education![0].institution).toBe(
      "University of Toronto",
    );
    expect(result.data!.skills).toContain("Swift");
  });
});

// ============================================================================
// SCENARIO 7: Fresh Graduate — no experience yet
// Tests education-only profile with a rich skills section
// ============================================================================

describe("Scenario 7: Fresh graduate with no work experience", () => {
  const transcript = `
    User: Hi, I'm Kenji Nakamura, kenji.n2024@email.com.
    I just graduated with a B.S. in Computer Science from UC San Diego in June 2024, GPA 3.92.
    I've never worked full-time but I have tons of project experience.
    Skills: Python, C++, ML, PyTorch, Scikit-learn, Git, Linux, LeetCode-hard level.
    Bot: Any internships or part-time roles?
    User: Not really, just academic projects and hackathons.
  `;

  it("extracts education with GPA and skills without fabricating experience", async () => {
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Kenji Nakamura",
        email: "kenji.n2024@email.com",
        education: [
          {
            degree: "B.S. Computer Science",
            institution: "UC San Diego",
            year: "2024",
            gpa: "3.92",
          },
        ],
        skills: [
          "Python",
          "C++",
          "ML",
          "PyTorch",
          "Scikit-learn",
          "Git",
          "Linux",
        ],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    const data = result.data!;
    expect(data.name).toBe("Kenji Nakamura");
    expect(data.education).toHaveLength(1);
    expect(data.education![0].gpa).toBe("3.92");
    expect(data.education![0].institution).toBe("UC San Diego");
    // No experience should have been fabricated
    expect(data.experience ?? []).toHaveLength(0);
    expect(data.skills).toContain("PyTorch");
  });
});

// ============================================================================
// SCENARIO 8: Location false-positive prevention
// The transcript contains "Anil A, anilalapati@gmail.com" — this was the
// original bug where the comma pattern caused "Anil A" to be the "city" and
// "gmail.com" to be the state. The extraction service MUST NOT set a location.
// ============================================================================

describe("Scenario 8: Location false-positive — name + email without location", () => {
  const transcript = `
    User: I'm Anil A, anilalapati.66@gmail.com. I work at IBM as SWE3.
    Bot: Where are you located?
    User: I'd rather not share that.
  `;

  it("does NOT extract a location when the user has not provided one", async () => {
    // AI returns no location field — simulates correct Gemini 2.5 Pro behavior
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Anil A",
        email: "anilalapati.66@gmail.com",
        experience: [
          {
            title: "SWE3",
            company: "IBM",
            duration: "Current",
            description: "Software engineering at IBM.",
          },
        ],
        // location intentionally omitted
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("Anil A");
    expect(result.data!.email).toBe("anilalapati.66@gmail.com");
    // Location must be absent — NOT inferred from name or email patterns
    expect(result.data!.location).toBeUndefined();
  });

  it("DOES extract a location when the user explicitly provides one", async () => {
    const transcriptWithLocation = `User: I'm Anil, anilalapati@gmail.com, based in Austin, TX.`;

    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        name: "Anil",
        email: "anilalapati@gmail.com",
        location: "Austin, TX",
      }),
    );

    const result = await extractWithStructuredOutput(transcriptWithLocation);

    expect(result.success).toBe(true);
    expect(result.data!.location).toBe("Austin, TX");
  });
});

// ============================================================================
// SCENARIO 9: Skills-as-experience false positive prevention
// A user types "React, Angular, Next.js, Firebase" and the AI must NOT create
// fake experience entries where company/title are skill names.
// The mapExtractionToRequirements looksLikeSkillsList() filter handles this.
// ============================================================================

describe("Scenario 9: Skills-only input — no fabricated experience entries", () => {
  const transcript = `
    User: I know React, Angular, Next.js, Firebase, PostgreSQL, Docker, Kubernetes.
    I've been coding for 4 years but all freelance, nothing formal.
  `;

  it("extracts skills but filters out any experience where title/company are tech stacks", async () => {
    // Simulate a weak model returning a false-positive experience entry
    mockGenerateTextWithTier.mockResolvedValue(
      aiResponse({
        skills: [
          "React",
          "Angular",
          "Next.js",
          "Firebase",
          "PostgreSQL",
          "Docker",
          "Kubernetes",
        ],
        experience: [
          // This is the false-positive pattern the looksLikeSkillsList filter catches
          {
            title: "React / Angular",
            company: "Next.js / Firebase",
            duration: "4 years",
            description: "Freelance development.",
          },
          // This is a legitimate entry and should survive
          {
            title: "Freelance Developer",
            company: "Self-employed",
            duration: "2020 - Present",
            description: "4 years of freelance coding across multiple clients.",
          },
        ],
      }),
    );

    const result = await extractWithStructuredOutput(transcript);

    expect(result.success).toBe(true);
    expect(result.data!.skills).toContain("React");
    expect(result.data!.skills).toContain("Docker");

    // The tech-stack false positive should have been filtered out
    const experienceTitles = (result.data!.experience ?? []).map(
      (e) => e.title,
    );
    expect(experienceTitles).not.toContain("React / Angular");

    // The legitimate freelance entry should survive
    const remainingCompanies = (result.data!.experience ?? []).map(
      (e) => e.company,
    );
    expect(
      remainingCompanies.some(
        (c) =>
          c.toLowerCase().includes("self") ||
          c.toLowerCase().includes("freelance") ||
          c.toLowerCase().includes("employed"),
      ),
    ).toBe(true);
  });
});

// ============================================================================
// SCENARIO 10: Guard conditions — empty input and skipAI flag
// Tests the early-return paths before ANY AI call is made
// ============================================================================

describe("Scenario 10: Guard conditions — empty input and skipAI", () => {
  it("returns fallback immediately for empty string — no AI call made", async () => {
    const result = await extractWithStructuredOutput("");

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.data).toBeNull();
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("returns fallback immediately for whitespace-only text — no AI call made", async () => {
    const result = await extractWithStructuredOutput("   \n\t  ");

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("returns fallback when skipAI option is true — no AI call made", async () => {
    const result = await extractWithStructuredOutput(
      "I'm John Doe, john@example.com, worked at Apple.",
      { skipAI: true },
    );

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.error).toContain("skipped");
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("returns fallback when text is too short (<10 characters)", async () => {
    const result = await extractWithStructuredOutput("hi");

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("returns fallback on AI provider error — no exception bubbles to caller", async () => {
    mockGenerateTextWithTier.mockRejectedValue(
      new Error("All AI providers failed after retries"),
    );

    const result = await extractWithStructuredOutput(
      "I am Jane Smith. Email jane@example.com. Worked at Meta for 3 years.",
    );

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.error).toBeTruthy();
    // Caller receives a generic message — not the raw provider error
    expect(result.data).toBeNull();
  });
});
