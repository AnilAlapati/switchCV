import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn().mockReturnValue({ verifyIdToken: jest.fn() }),
}));
jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([]), // Always return empty to force initialization attempt
  cert: jest.fn(),
}));
jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: jest
    .fn()
    .mockResolvedValue({ text: "response", model: "gpt-4" }),
}));
jest.mock("@/lib/services/conversationManager", () => ({
  ConversationManager: jest.fn().mockImplementation(() => ({
    updateData: jest.fn(),
    getProgress: jest
      .fn()
      .mockReturnValue({ completenessPercentage: 0, isReadyToCreate: false }),
    getData: jest.fn().mockReturnValue({}),
    validate: jest.fn().mockReturnValue({ valid: true }),
  })),
}));
jest.mock("@/lib/services/resumeDataExtractor", () => ({
  ResumeDataExtractor: {
    extractFromConversation: jest
      .fn()
      .mockReturnValue({ data: {}, confidence: 1, isComplete: false }),
  },
}));
jest.mock("@/lib/services/resumePrompts", () => ({
  buildConversationalPrompt: jest.fn(),
  extractResumeJSON: jest.fn(),
  isCompletionResponse: jest.fn(),
}));
jest.mock("@/lib/services/conversationConfig", () => ({
  getActiveConfig: jest.fn().mockReturnValue({}),
}));
jest.mock("@/lib/numericIdGenerator", () => ({
  generateNumericResumeId: jest.fn(),
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: { collection: jest.fn() },
}));

describe("POST /api/resume/generate - Env Vars", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should warn if Firebase credentials are missing", async () => {
    // Unset credentials
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;

    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Import the module dynamically to trigger initialization logic
    const { POST } = await import("./route");

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "test", conversationHistory: [] }),
    });

    await POST(req);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Firebase credentials not configured - API may not work properly"
    );

    consoleWarnSpy.mockRestore();
  });

  it("should initialize Firebase if credentials are present", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@example.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    const { initializeApp } = await import("firebase-admin/app");

    const { POST } = await import("./route");

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "test", conversationHistory: [] }),
    });

    await POST(req);

    expect(initializeApp).toHaveBeenCalled();
  });

  it("should handle initialization failure", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@example.com";

    const { initializeApp } = await import("firebase-admin/app");
    (initializeApp as jest.Mock).mockImplementation(() => {
      throw new Error("Init failed");
    });

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const { POST } = await import("./route");

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "test", conversationHistory: [] }),
    });

    await POST(req);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to initialize Firebase Admin:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
