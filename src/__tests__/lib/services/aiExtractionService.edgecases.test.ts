/**
 * Edge-case stress tests for AI extraction post-processing filters
 *
 * Tests looksLikeSkillsList, looksLikeSectionHeader, looksLikeConversationalText
 * by importing mapExtractionToRequirements indirectly through the module's
 * public API. Since the filter functions are private, we test them through
 * extractWithStructuredOutput with mocked AI responses.
 */

// These tests exercise the filter functions through the mapping pipeline.
// We mock the AI provider to return specific responses and verify the filters
// catch bad data.

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

jest.mock("@/lib/services/aiMonitoringService", () => ({
  classifyAIFailure: jest.fn(() => ({
    failureCode: "test",
    errorMessage: "test",
    providerErrorClass: "test",
  })),
  markAIStageFailed: jest.fn(),
  persistAIFailureEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock the AI provider to return controlled responses
const mockGenerateTextWithTier = jest.fn();
jest.mock("@/server/services/aiProviderService", () => ({
  generateTextWithTier: (...args: unknown[]) =>
    mockGenerateTextWithTier(...args),
}));

import {
  extractWithStructuredOutput,
  resetFailureTracker,
} from "@/lib/services/aiExtractionService";

beforeEach(() => {
  jest.clearAllMocks();
  resetFailureTracker();
});

/** Helper to make the mock return a specific JSON payload */
function mockAIResponse(data: Record<string, unknown>) {
  mockGenerateTextWithTier.mockResolvedValue({
    text: JSON.stringify(data),
    model: "gemini-2.5-pro",
    provider: "google",
  });
}

describe("Post-processing filters — experience", () => {
  it("should REJECT experience where title is a section header (LANGUAGES)", async () => {
    mockAIResponse({
      experience: [
        {
          title: "LANGUAGES",
          company: "English",
          duration: "",
          description: "Native proficiency",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    // LANGUAGES should be filtered out
    expect(result.data?.experience).toBeUndefined();
  });

  it("should REJECT experience where company is 'References'", async () => {
    mockAIResponse({
      experience: [
        {
          title: "Available Upon Request",
          company: "References",
          duration: "",
          description: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.experience).toBeUndefined();
  });

  it("should REJECT experience with conversational title (what are you)", async () => {
    mockAIResponse({
      experience: [
        {
          title: "what are you saying",
          company: "unable to understand",
          duration: "",
          description: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.experience).toBeUndefined();
  });

  it("should KEEP valid experience entries and REJECT invalid ones", async () => {
    mockAIResponse({
      experience: [
        {
          title: "Software Engineer",
          company: "Google",
          duration: "2020-2022",
          description: "Backend work",
        },
        {
          title: "LANGUAGES",
          company: "English Hindi Telugu",
          duration: "",
          description: "",
        },
        {
          title: "Hobbies",
          company: "Reading",
          duration: "",
          description: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.experience).toHaveLength(1);
    expect(result.data?.experience![0].company).toBe("Google");
  });

  it("should REJECT experience where both title and company are tech keywords", async () => {
    mockAIResponse({
      experience: [
        {
          title: "React Angular Firebase",
          company: "Python Node.js",
          duration: "",
          description: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    // looksLikeSkillsList should catch this
    expect(result.data?.experience).toBeUndefined();
  });

  it("should KEEP legitimate titles like 'Senior React Developer'", async () => {
    mockAIResponse({
      experience: [
        {
          title: "Senior React Developer",
          company: "Meta",
          duration: "2022-present",
          description: "Led frontend team",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.experience).toHaveLength(1);
    expect(result.data?.experience![0].title).toBe("Senior React Developer");
  });
});

describe("Post-processing filters — education", () => {
  it("should REJECT education where degree is conversational text", async () => {
    mockAIResponse({
      education: [
        {
          degree: "what are you saying",
          institution: "unable to understand",
          year: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    // Should be filtered out entirely or be empty
    expect(
      result.data?.education === undefined ||
        result.data?.education?.length === 0,
    ).toBe(true);
  });

  it("should REJECT education where institution is a section header", async () => {
    mockAIResponse({
      education: [
        {
          degree: "Certified",
          institution: "Certification",
          year: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(
      result.data?.education === undefined ||
        result.data?.education?.length === 0,
    ).toBe(true);
  });

  it("should KEEP valid education and REJECT invalid", async () => {
    mockAIResponse({
      education: [
        {
          degree: "B.Tech",
          institution: "SBCE College",
          year: "2014",
          gpa: "7.2 CGPA",
        },
        {
          degree: "that's wrong",
          institution: "please fix it",
          year: "",
        },
        {
          degree: "Declaration",
          institution: "Personal Info",
          year: "",
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.education).toHaveLength(1);
    expect(result.data?.education![0].institution).toBe("SBCE College");
  });

  it("should KEEP multiple valid education entries", async () => {
    mockAIResponse({
      education: [
        { degree: "B.Tech", institution: "IIT Delhi", year: "2018" },
        { degree: "M.S.", institution: "Stanford University", year: "2020" },
        { degree: "Ph.D.", institution: "MIT", year: "2024" },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.education).toHaveLength(3);
  });
});

describe("Section header detection — comprehensive coverage", () => {
  const SECTION_HEADERS_THAT_MUST_BE_CAUGHT = [
    "Languages",
    "LANGUAGES",
    "Language",
    "References",
    "REFERENCES",
    "Reference",
    "Hobbies",
    "HOBBIES",
    "Interests",
    "INTERESTS",
    "Certifications",
    "CERTIFICATIONS",
    "Certification",
    "Certificate",
    "Certificates",
    "Awards",
    "AWARDS",
    "Award",
    "Publications",
    "PUBLICATIONS",
    "Objective",
    "OBJECTIVE",
    "Summary",
    "SUMMARY",
    "Contact Info",
    "Contact Information",
    "CONTACT INFORMATION",
    "Personal Info",
    "Personal Details",
    "PERSONAL DETAILS",
    "Declaration",
    "DECLARATION",
    "Social Links",
    "SOCIAL LINKS",
    "Social Link",
  ];

  it.each(SECTION_HEADERS_THAT_MUST_BE_CAUGHT)(
    "should REJECT experience with section header: %s",
    async (header) => {
      mockAIResponse({
        experience: [
          {
            title: header,
            company: "Some Text",
            duration: "",
            description: "",
          },
        ],
      });

      const result = await extractWithStructuredOutput(
        "long enough input text for extraction to run properly here",
      );
      expect(result.success).toBe(true);
      expect(result.data?.experience).toBeUndefined();
    },
  );

  const VALID_TITLES_THAT_MUST_NOT_BE_CAUGHT = [
    "Software Engineer",
    "Senior RPA Developer",
    "Data Scientist",
    "Project Manager",
    "CTO",
    "Machine Learning Engineer",
    "DevOps Lead",
    "Full Stack Developer",
    "Principal Architect",
  ];

  it.each(VALID_TITLES_THAT_MUST_NOT_BE_CAUGHT)(
    "should KEEP experience with valid title: %s",
    async (title) => {
      mockAIResponse({
        experience: [
          {
            title,
            company: "Acme Corp",
            duration: "2020-2024",
            description: "Did great work",
          },
        ],
      });

      const result = await extractWithStructuredOutput(
        "long enough input text for extraction to run properly here",
      );
      expect(result.success).toBe(true);
      expect(result.data?.experience).toHaveLength(1);
      expect(result.data?.experience![0].title).toBe(title);
    },
  );
});

describe("META_INTENT_PATTERN coverage", () => {
  // We can't test META_INTENT_PATTERN directly since it's in the orchestrator,
  // but we CAN test that looksLikeConversationalText catches the patterns
  // that would slip through if META_INTENT_PATTERN missed them.

  const FRUSTRATION_PHRASES_IN_EDUCATION = [
    { degree: "what are you talking about", institution: "I dont understand" },
    { degree: "please fix this", institution: "its not working" },
    { degree: "showing wrong data", institution: "unable to see" },
    { degree: "why is this happening", institution: "nothing works" },
    { degree: "can you update this", institution: "preview is wrong" },
  ];

  it.each(FRUSTRATION_PHRASES_IN_EDUCATION)(
    "should filter out education: degree=%s inst=%s",
    async (edu) => {
      mockAIResponse({ education: [{ ...edu, year: "" }] });
      const result = await extractWithStructuredOutput(
        "long enough input text for extraction to run properly here",
      );
      expect(result.success).toBe(true);
      expect(
        result.data?.education === undefined ||
          result.data?.education?.length === 0,
      ).toBe(true);
    },
  );
});

describe("Mixed valid + invalid data", () => {
  it("should correctly filter a messy AI response (real-world scenario)", async () => {
    mockAIResponse({
      name: "Anil Alapati",
      email: "anilalapati.66@gmail.com",
      summary:
        "Experienced software engineer with GenAI and automation background",
      experience: [
        {
          title: "Software Engineer III",
          company: "JPMorgan Chase",
          duration: "01-2024 - Present",
          description: "Led a team of 5 delivering GenAI solutions",
        },
        {
          title: "Senior RPA Developer",
          company: "TEKsystems",
          duration: "2020-2024",
          description: "RPA automation",
        },
        {
          title: "LANGUAGES",
          company: "English",
          duration: "",
          description: "Native proficiency in English",
        },
      ],
      education: [
        {
          degree: "B.Tech",
          institution: "SBCE College",
          year: "2014",
          gpa: "7.2 CGPA",
        },
        {
          degree: "what are you saying",
          institution: "unable to understand",
          year: "",
        },
      ],
      skills: ["Python", "React", "Node.js", "Firebase", "Azure", "AWS"],
      projects: [
        {
          name: "SwitchCV",
          description: "Digital resume platform",
          technologies: ["Next.js", "Firebase"],
        },
      ],
    });

    const result = await extractWithStructuredOutput(
      "long enough input text for extraction to run properly here",
    );
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Anil Alapati");
    expect(result.data?.email).toBe("anilalapati.66@gmail.com");
    // LANGUAGES entry filtered out
    expect(result.data?.experience).toHaveLength(2);
    expect(result.data?.experience![0].company).toBe("JPMorgan Chase");
    expect(result.data?.experience![1].company).toBe("TEKsystems");
    // "what are you saying" entry filtered out
    expect(result.data?.education).toHaveLength(1);
    expect(result.data?.education![0].institution).toBe("SBCE College");
    // Skills and projects preserved
    expect(result.data?.skills).toHaveLength(6);
    expect(result.data?.projects).toHaveLength(1);
  });
});
