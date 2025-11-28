/**
 * Tests for lib/sessionStorage utility
 */

import {
  saveSessionData,
  loadSessionData,
  clearSessionData,
  updateAnswer,
  getAnswer,
} from "@/lib/sessionStorage";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock localStorage globally
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import { logger } from "@/lib/logger";

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Session Storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe("saveSessionData", () => {
    it("should save session data to localStorage", () => {
      const userId = "user123";
      const currentQuestionId = "question1";
      const answers = { q1: "answer1", q2: ["option1", "option2"] };
      const completed = false;

      saveSessionData(userId, currentQuestionId, answers, completed);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "resume_creation_session",
        expect.stringContaining('"userId":"user123"')
      );

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toEqual({
        userId,
        currentQuestionId,
        answers,
        completed,
        lastUpdated: expect.any(String),
      });
    });

    it("should save completed session data", () => {
      const userId = "user456";
      const currentQuestionId = "question5";
      const answers = { q1: "answer1", q2: 42, q3: true };
      const completed = true;

      saveSessionData(userId, currentQuestionId, answers, completed);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.completed).toBe(true);
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      saveSessionData("user123", "question1", { q1: "answer1" });

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Failed to save session data:"
      );
    });
  });

  describe("loadSessionData", () => {
    it("should return null when no session data exists", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadSessionData("user123");

      expect(result).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "resume_creation_session"
      );
    });

    it("should return null when session belongs to different user", () => {
      const sessionData = {
        userId: "user456",
        currentQuestionId: "question1",
        answers: { q1: "answer1" },
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      const result = loadSessionData("user123");

      expect(result).toBeNull();
    });

    it("should return session data for correct user within 24 hours", () => {
      const sessionData = {
        userId: "user123",
        currentQuestionId: "question2",
        answers: { q1: "answer1", q2: ["option1"] },
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      const result = loadSessionData("user123");

      expect(result).toEqual(sessionData);
    });

    it("should return null when session is older than 24 hours", () => {
      const twentyFiveHoursAgo = new Date();
      twentyFiveHoursAgo.setHours(twentyFiveHoursAgo.getHours() - 25);

      const sessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: { q1: "answer1" },
        lastUpdated: twentyFiveHoursAgo.toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      const result = loadSessionData("user123");

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "resume_creation_session"
      );
    });

    it("should return null when session data is corrupted", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const result = loadSessionData("user123");

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Failed to load session data:"
      );
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage access denied");
      });

      const result = loadSessionData("user123");

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Failed to load session data:"
      );
    });
  });

  describe("clearSessionData", () => {
    it("should remove session data from localStorage", () => {
      clearSessionData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "resume_creation_session"
      );
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error("Storage access denied");
      });

      clearSessionData();

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Failed to clear session data:"
      );
    });
  });

  describe("updateAnswer", () => {
    it("should update existing answer in session data", () => {
      const existingSessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: { q1: "old answer", q2: "existing answer" },
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSessionData)
      );

      updateAnswer("q1", "new answer");

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "resume_creation_session",
        expect.stringContaining('"q1":"new answer"')
      );

      const updatedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(updatedData.answers.q1).toBe("new answer");
      expect(updatedData.answers.q2).toBe("existing answer");
      // lastUpdated should be updated
      expect(updatedData.lastUpdated).toBeDefined();
    });

    it("should add new answer to session data", () => {
      const existingSessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: { q1: "answer1" },
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSessionData)
      );

      updateAnswer("q2", ["option1", "option2"]);

      const updatedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(updatedData.answers.q2).toEqual(["option1", "option2"]);
    });

    it("should handle string answer type", () => {
      const existingSessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: {},
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSessionData)
      );

      updateAnswer("stringAnswer", "text answer");

      const updatedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(updatedData.answers.stringAnswer).toBe("text answer");
    });

    it("should handle array answer type", () => {
      const existingSessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: {},
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSessionData)
      );

      updateAnswer("arrayAnswer", ["item1", "item2"]);

      const updatedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(updatedData.answers.arrayAnswer).toEqual(["item1", "item2"]);
    });

    it("should handle number answer type", () => {
      const existingSessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: {},
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSessionData)
      );

      updateAnswer("numberAnswer", 42);

      const updatedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(updatedData.answers.numberAnswer).toBe(42);
    });

    it("should handle boolean answer type", () => {
      const existingSessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: {},
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSessionData)
      );

      updateAnswer("booleanAnswer", true);

      const updatedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(updatedData.answers.booleanAnswer).toBe(true);
    });

    it("should do nothing when no session data exists", () => {
      localStorageMock.getItem.mockReturnValue(null);

      updateAnswer("q1", "answer");

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe("getAnswer", () => {
    it("should return answer for existing question", () => {
      const sessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: {
          q1: "answer1",
          q2: ["option1", "option2"],
          q3: 42,
          q4: true,
        },
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      expect(getAnswer("q1")).toBe("answer1");
      expect(getAnswer("q2")).toEqual(["option1", "option2"]);
      expect(getAnswer("q3")).toBe(42);
      expect(getAnswer("q4")).toBe(true);
    });

    it("should return null for non-existent question", () => {
      const sessionData = {
        userId: "user123",
        currentQuestionId: "question1",
        answers: { q1: "answer1" },
        lastUpdated: new Date().toISOString(),
        completed: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      expect(getAnswer("nonexistent")).toBeNull();
    });

    it("should return null when no session data exists", () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(getAnswer("q1")).toBeNull();
    });
  });
});
