import {
  getInitialGreeting,
  buildConversationalPrompt,
  buildResumeCreationPrompt,
  isCompletionResponse,
  extractResumeJSON,
  getFollowUpQuestion,
  getProgressMessage,
  RESUME_ASSISTANT_SYSTEM_PROMPT,
} from "@/lib/services/resumePrompts";
import { getActiveConfig } from "@/lib/services/conversationConfig";

// Mock the config
jest.mock("@/lib/services/conversationConfig", () => ({
  getActiveConfig: jest.fn(),
}));

describe("resumePrompts", () => {
  const mockConfig = {
    contextWindowSize: 5,
    enableSmartQuestions: false,
    maxQuestionsInBetaMode: false,
    maxBetaQuestions: 10,
    priorityFields: ["name", "email", "experience"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveConfig as jest.Mock).mockReturnValue(mockConfig);
  });

  describe("getInitialGreeting", () => {
    it("should return the greeting string", () => {
      const greeting = getInitialGreeting();
      expect(greeting).toContain("Hey! I'm your Career Coach AI");
      expect(greeting).toContain("name, email, and what kind of role");
    });
  });

  describe("buildConversationalPrompt", () => {
    const mockHistory = [
      { content: "Hi", isUser: true },
      { content: "Hello", isUser: false },
    ];

    it("should build a basic prompt with history", () => {
      const prompt = buildConversationalPrompt("My name is John", mockHistory);
      expect(prompt).toContain(RESUME_ASSISTANT_SYSTEM_PROMPT);
      expect(prompt).toContain("User: Hi");
      expect(prompt).toContain("Assistant: Hello");
      expect(prompt).toContain('User\'s latest message: "My name is John"');
    });

    it("should include collected data if provided", () => {
      const collectedData = { name: "John" };
      const prompt = buildConversationalPrompt(
        "msg",
        [],
        undefined,
        collectedData,
      );
      expect(prompt).toContain("CURRENTLY COLLECTED DATA:");
      expect(prompt).toContain('"name": "John"');
    });

    it("should handle forceCreate flag", () => {
      const prompt = buildConversationalPrompt(
        "create it",
        [],
        undefined,
        undefined,
        undefined,
        true,
      );
      expect(prompt).toContain(
        "USER REQUEST: The user explicitly wants to create the resume NOW",
      );
      expect(prompt).toContain('Generate the "RESUME_COMPLETE" response');
      expect(prompt).toContain("Do NOT infer or fabricate missing companies");
    });

    it("should include missing info hints", () => {
      const progress = {
        hasName: true,
        hasEmail: false,
        hasExperience: false,
        hasEducation: true,
        hasSkills: true,
      };
      const prompt = buildConversationalPrompt("msg", [], progress);
      // New format uses "STATUS: The following fields are NOT yet structured:"
      expect(prompt).toContain(
        "STATUS: The following fields are NOT yet structured: email, work experience",
      );
    });

    it("should indicate completion when all info is present", () => {
      const progress = {
        hasName: true,
        hasEmail: true,
        hasExperience: true,
        hasEducation: true,
        hasSkills: true,
      };
      const prompt = buildConversationalPrompt("msg", [], progress);
      expect(prompt).toContain(
        "INFO COMPLETE: All required information collected",
      );
    });

    describe("Beta Mode Smart Questions", () => {
      beforeEach(() => {
        (getActiveConfig as jest.Mock).mockReturnValue({
          ...mockConfig,
          enableSmartQuestions: true,
          maxQuestionsInBetaMode: true,
          maxBetaQuestions: 4,
        });
      });

      it("should ask smart questions when under limit", () => {
        // 2 messages in history = 1 question asked (approx)
        const prompt = buildConversationalPrompt("msg", mockHistory, {
          hasName: false,
        });
        expect(prompt).toContain("BETA MODE: Ask ONE smart question");
        expect(prompt).toContain("REMAINING QUESTIONS ALLOWED:");
      });

      it("should force completion when limit reached", () => {
        // 10 messages with 5 AI turns (isUser: false) = 5 questions > 4 max
        const longHistory = Array.from({ length: 10 }, (_, i) => ({
          content: "msg",
          isUser: i % 2 === 0,
        }));
        const prompt = buildConversationalPrompt("msg", longHistory, {
          hasName: false,
        });
        expect(prompt).toContain("BETA MODE: Maximum questions reached");
        expect(prompt).toContain("offer to create the resume NOW");
      });
    });
  });

  describe("buildResumeCreationPrompt", () => {
    it("should build prompt with collected data", () => {
      const data = { name: "John", email: "john@example.com" };
      const prompt = buildResumeCreationPrompt(data);
      expect(prompt).toContain(
        "Based on the following information, create a professional resume",
      );
      expect(prompt).toContain('"name": "John"');
      expect(prompt).toContain('"email": "john@example.com"');
    });
  });

  describe("isCompletionResponse", () => {
    it("should detect completion indicators", () => {
      expect(isCompletionResponse("RESUME_COMPLETE")).toBe(true);
      expect(isCompletionResponse("Here is the JSON: ```json ...")).toBe(true);
      expect(isCompletionResponse("I have all the information")).toBe(true);
    });

    it("should return false for normal conversation", () => {
      expect(isCompletionResponse("What is your email?")).toBe(false);
      expect(isCompletionResponse("Hello there")).toBe(false);
    });
  });

  describe("extractResumeJSON", () => {
    it("should extract valid JSON from code block", () => {
      const json = { isComplete: true, name: "John" };
      const response = `Here is the resume:
\`\`\`json
${JSON.stringify(json)}
\`\`\`
Thanks!`;
      const result = extractResumeJSON(response);
      expect(result).toEqual(json);
    });

    it("should return null if JSON is invalid", () => {
      const response = `\`\`\`json
{ invalid json
\`\`\``;
      expect(extractResumeJSON(response)).toBeNull();
    });

    it("should return null if no JSON block found", () => {
      expect(extractResumeJSON("No json here")).toBeNull();
    });

    it("should return null if isComplete is missing/false", () => {
      const json = { name: "John" };
      const response = `\`\`\`json
${JSON.stringify(json)}
\`\`\``;
      expect(extractResumeJSON(response)).toBeNull();
    });
  });

  describe("getFollowUpQuestion", () => {
    it("should return specific question for known field", () => {
      expect(getFollowUpQuestion(["name"])).toContain("full name and email");
      expect(getFollowUpQuestion(["email"])).toContain("email address");
      expect(getFollowUpQuestion(["phone"])).toContain("phone number");
    });

    it("should return generic question for unknown field", () => {
      expect(getFollowUpQuestion(["unknown"])).toContain(
        "I need more information about your unknown",
      );
    });
  });

  describe("getProgressMessage", () => {
    it("should return appropriate message for percentage", () => {
      expect(getProgressMessage(10)).toContain("Great start");
      expect(getProgressMessage(40)).toContain("making good progress");
      expect(getProgressMessage(60)).toContain("Excellent");
      expect(getProgressMessage(90)).toContain("Almost done");
      expect(getProgressMessage(100)).toContain("Perfect");
    });
  });

  // ============================================================
  // REGRESSION TESTS — Replay exact scenarios from user transcript
  // These prove the prompt improvements work for the real failures
  // ============================================================
  describe("Regression: Bulk paste detection", () => {
    it("should detect multi-line work experience paste", () => {
      // Simulates the exact user scenario: pasting full work history
      const bulkWorkExperience = `JPMC (Jan 2020 - Present) - Senior Software Engineer
- Built microservices handling 5M transactions/day
- Led migration from monolith to event-driven architecture
TEKsystems (2018-2020) - Software Developer
- Developed REST APIs for healthcare platform
- Improved query performance by 40%
IBM (2015-2018) - Junior Developer
- Maintained legacy Java applications
- Wrote unit tests improving coverage from 40% to 85%`;

      const prompt = buildConversationalPrompt(bulkWorkExperience, [
        {
          content: "Hi, I'm Anil, anil@test.com, targeting Senior SWE roles",
          isUser: true,
        },
        {
          content: "Great! Tell me about your work experience.",
          isUser: false,
        },
      ]);

      expect(prompt).toContain("BULK INPUT DETECTED");
      expect(prompt).toContain("Parse and absorb ALL items");
      expect(prompt).toContain("do NOT cherry-pick one and ignore the rest");
    });

    it("should detect long single-paragraph paste (>500 chars)", () => {
      const longPaste =
        "I worked at Google as a Senior Engineer from 2019 to 2023 where I led a team of 8 engineers building the Cloud Storage API. Before that I was at Amazon from 2015 to 2019 as a Software Development Engineer working on DynamoDB query optimization. I also did an internship at Microsoft in 2014 working on Azure DevOps tooling. My education is B.S. Computer Science from Stanford 2015 with 3.9 GPA and M.S. from MIT 2017. Skills include Java, Python, Go, Kubernetes, Terraform, AWS, GCP, distributed systems, and machine learning.";

      const prompt = buildConversationalPrompt(longPaste, []);

      expect(prompt).toContain("BULK INPUT DETECTED");
      expect(prompt).toContain(String(longPaste.length));
    });

    it("should NOT trigger bulk detection for short messages", () => {
      const prompt = buildConversationalPrompt("My name is John", []);
      expect(prompt).not.toContain("BULK INPUT DETECTED");
    });
  });

  describe("Regression: User frustration detection", () => {
    it("should detect 'already mentioned' frustration", () => {
      // Exact scenario from transcript: user said "Already mentioned right"
      const prompt = buildConversationalPrompt("Already mentioned right", [
        { content: "I'm Anil, anil@test.com", isUser: true },
        { content: "Great! What's your email?", isUser: false },
      ]);

      expect(prompt).toContain("USER FRUSTRATION DETECTED");
      expect(prompt).toContain("Do NOT ask for the same thing again");
      expect(prompt).toContain("Apologize briefly");
    });

    it("should detect 'I already gave you' frustration", () => {
      const prompt = buildConversationalPrompt(
        "I already gave you my education details",
        [
          { content: "S.B.C.E, 2010-2014, ECE, 7.2 CGPA", isUser: true },
          { content: "Can you tell me about your education?", isUser: false },
        ],
      );

      expect(prompt).toContain("USER FRUSTRATION DETECTED");
    });

    it("should detect 'I just told you' frustration", () => {
      const prompt = buildConversationalPrompt("I just told you that", []);
      expect(prompt).toContain("USER FRUSTRATION DETECTED");
    });

    it("should detect 'I already said' frustration", () => {
      const prompt = buildConversationalPrompt(
        "I already said my name is Anil",
        [],
      );
      expect(prompt).toContain("USER FRUSTRATION DETECTED");
    });

    it("should detect 'I provided' frustration", () => {
      const prompt = buildConversationalPrompt(
        "I have already provided all this info",
        [],
      );
      expect(prompt).toContain("USER FRUSTRATION DETECTED");
    });

    it("should NOT trigger frustration for normal messages", () => {
      const prompt = buildConversationalPrompt(
        "My skills are Python and Java",
        [],
      );
      expect(prompt).not.toContain("USER FRUSTRATION DETECTED");
    });
  });

  describe("Regression: Never re-ask system prompt rules", () => {
    it("should contain NEVER RE-ASK rule in system prompt", () => {
      expect(RESUME_ASSISTANT_SYSTEM_PROMPT).toContain(
        "CRITICAL RULE — CURRENTLY COLLECTED DATA IS THE GROUND TRUTH",
      );
    });

    it("should contain BULK INPUT HANDLING rule in system prompt", () => {
      expect(RESUME_ASSISTANT_SYSTEM_PROMPT).toContain("BULK INPUT HANDLING:");
      expect(RESUME_ASSISTANT_SYSTEM_PROMPT).toContain(
        "ABSORB ALL OF IT in one go",
      );
    });

    it("should instruct AI to use CURRENTLY COLLECTED DATA before asking", () => {
      expect(RESUME_ASSISTANT_SYSTEM_PROMPT).toContain(
        "NEVER ask for any field that is already present in CURRENTLY COLLECTED DATA",
      );
    });

    it("should instruct AI to confirm rather than re-ask", () => {
      expect(RESUME_ASSISTANT_SYSTEM_PROMPT).toContain(
        "confirm what you captured",
      );
    });
  });

  describe("Regression: Question counting uses AI turns only", () => {
    it("should count only AI responses, not total messages", () => {
      (getActiveConfig as jest.Mock).mockReturnValue({
        ...mockConfig,
        enableSmartQuestions: true,
        maxQuestionsInBetaMode: true,
        maxBetaQuestions: 4,
      });

      // 8 messages: 4 user + 4 AI = 4 AI turns = maxBetaQuestions
      const history = [
        { content: "Hi I'm Anil", isUser: true },
        { content: "Hi Anil! Tell me about experience.", isUser: false },
        { content: "I worked at JPMC", isUser: true },
        { content: "Great! Education?", isUser: false },
        { content: "SBCE 2010-2014", isUser: true },
        { content: "Skills?", isUser: false },
        { content: "Java, Python", isUser: true },
        { content: "Anything else?", isUser: false },
      ];

      const prompt = buildConversationalPrompt("no that's all", history, {
        hasName: true,
        hasEmail: false,
      });

      // 4 AI turns = maxBetaQuestions(4), so should force completion
      expect(prompt).toContain("Maximum questions reached");
      expect(prompt).toContain("offer to create the resume NOW");
    });

    it("should NOT force completion when AI turns are below limit", () => {
      (getActiveConfig as jest.Mock).mockReturnValue({
        ...mockConfig,
        enableSmartQuestions: true,
        maxQuestionsInBetaMode: true,
        maxBetaQuestions: 4,
      });

      // 4 messages: 2 user + 2 AI = 2 AI turns < 4 max
      const history = [
        { content: "Hi", isUser: true },
        { content: "Hello!", isUser: false },
        { content: "I'm Anil", isUser: true },
        { content: "Great! Experience?", isUser: false },
      ];

      const prompt = buildConversationalPrompt("I worked at JPMC", history, {
        hasName: true,
        hasEmail: false,
      });

      expect(prompt).toContain("REMAINING QUESTIONS ALLOWED: 2");
      expect(prompt).not.toContain("Maximum questions reached");
    });
  });

  describe("Regression: Collected data context inclusion", () => {
    it("should include collected data so AI sees what it already has", () => {
      const collectedData = {
        name: "Anil",
        email: "anil@test.com",
        experience: [
          {
            title: "Senior Software Engineer",
            company: "JPMC",
            duration: "2020-Present",
            description: "Built microservices",
          },
        ],
        education: [
          {
            degree: "B.Tech",
            institution: "S.B.C.E",
            year: "2014",
            major: "ECE",
            grade: "7.2 CGPA",
          },
        ],
      };

      const prompt = buildConversationalPrompt(
        "What about skills?",
        [
          { content: "Hi I'm Anil", isUser: true },
          { content: "Great! Experience?", isUser: false },
        ],
        {
          hasName: true,
          hasEmail: true,
          hasExperience: true,
          hasEducation: true,
          hasSkills: false,
        },
        collectedData,
      );

      // The prompt should contain the collected data so the AI can see it
      expect(prompt).toContain("CURRENTLY COLLECTED DATA:");
      expect(prompt).toContain('"name": "Anil"');
      expect(prompt).toContain('"company": "JPMC"');
      expect(prompt).toContain('"institution": "S.B.C.E"');
      expect(prompt).toContain('"grade": "7.2 CGPA"');
      // Only skills should be missing
      expect(prompt).toContain("NOT yet structured: skills");
      // Should instruct AI to check conversation before asking
      expect(prompt).toContain('Check the "Previous conversation" carefully');
    });

    it("should include check-conversation instruction for non-beta mode", () => {
      (getActiveConfig as jest.Mock).mockReturnValue({
        ...mockConfig,
        enableSmartQuestions: false,
      });

      const prompt = buildConversationalPrompt("msg", [], {
        hasName: true,
        hasEmail: false,
      });

      expect(prompt).toContain(
        "If the user has already mentioned details relevant to these fields",
      );
      expect(prompt).toContain("DO NOT ask for them again");
    });
  });

  describe("Regression: Combined scenario — real conversation replay", () => {
    it("should produce correct directives for a conversation where user provides bulk data then gets frustrated", () => {
      (getActiveConfig as jest.Mock).mockReturnValue({
        ...mockConfig,
        enableSmartQuestions: true,
        maxQuestionsInBetaMode: true,
        maxBetaQuestions: 4,
      });

      // Replay the exact bad conversation flow
      const conversationHistory = [
        {
          content:
            "Hi, I'm Anil, email anil@test.com, targeting senior SWE roles",
          isUser: true,
        },
        {
          content: "Great! Tell me about your work experience.",
          isUser: false,
        },
        {
          content: `JPMC - Senior SWE (2020-Present)
Built microservices, led team of 5
TEKsystems - SWE (2018-2020)
Developed REST APIs
IBM - Junior Dev (2015-2018)
Maintained Java apps`,
          isUser: true,
        },
        {
          content: "Great experience at JPMC! Tell me about your education.",
          isUser: false,
        },
        { content: "S.B.C.E, 2010-2014, ECE, 7.2 CGPA", isUser: true },
        { content: "What about your education details?", isUser: false }, // BAD: re-asked!
      ];

      // User's frustrated response
      const userMessage = "Already mentioned right";

      const prompt = buildConversationalPrompt(
        userMessage,
        conversationHistory,
        {
          hasName: true,
          hasEmail: true,
          hasExperience: true,
          hasEducation: true,
          hasSkills: false,
        },
        {
          name: "Anil",
          email: "anil@test.com",
          experience: [
            {
              title: "Senior SWE",
              company: "JPMC",
              duration: "2020-Present",
              description: "Built microservices",
            },
          ],
          education: [
            {
              degree: "B.Tech",
              institution: "S.B.C.E",
              year: "2014",
              major: "ECE",
              grade: "7.2 CGPA",
            },
          ],
        },
      );

      // All protective directives should be present:
      // 1. Frustration detected
      expect(prompt).toContain("USER FRUSTRATION DETECTED");
      expect(prompt).toContain("Apologize briefly");

      // 2. Collected data visible so AI knows what it has
      expect(prompt).toContain('"institution": "S.B.C.E"');
      expect(prompt).toContain('"grade": "7.2 CGPA"');

      // 3. Beta mode: 3 AI turns out of 4 max = 1 remaining question
      expect(prompt).toContain("REMAINING QUESTIONS ALLOWED: 1");

      // 4. System prompt contains NEVER RE-ASK rule
      expect(prompt).toContain("CURRENTLY COLLECTED DATA IS THE GROUND TRUTH");

      // 5. AI should be told to check conversation before asking
      expect(prompt).toContain(
        "Before asking about any field, check the conversation above",
      );
    });
  });
});
