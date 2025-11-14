// src/__tests__/lib/sessionStorage.test.ts
import {
  saveSessionData,
  loadSessionData,
  clearSessionData,
  updateAnswer,
  getAnswer,
} from "@/lib/sessionStorage";

describe("Session Storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should save and load session data", () => {
    const testData = {
      userId: "user123",
      currentQuestionId: "q1",
      answers: { q1: "answer1" },
    };

    saveSessionData(
      testData.userId,
      testData.currentQuestionId,
      testData.answers
    );
    const result = loadSessionData(testData.userId);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user123");
    expect(result?.currentQuestionId).toBe("q1");
  });

  test("should return null for non-existent session", () => {
    const result = loadSessionData("nonExistentUser");
    expect(result).toBeNull();
  });

  test("should clear session data", () => {
    saveSessionData("user123", "q1", { q1: "answer" });
    clearSessionData();
    const result = loadSessionData("user123");
    expect(result).toBeNull();
  });

  test("should update answer", () => {
    saveSessionData("user123", "q1", { q1: "initial" });
    updateAnswer("q1", "updated");
    const result = getAnswer("q1");
    expect(result).toBe("updated");
  });

  test("should get answer", () => {
    saveSessionData("user123", "q1", { q1: "test answer" });
    const result = getAnswer("q1");
    expect(result).toBe("test answer");
  });

  test("should return null for non-existent answer", () => {
    const result = getAnswer("nonExistent");
    expect(result).toBeNull();
  });

  test("should mark session as completed", () => {
    saveSessionData("user123", "q1", { q1: "answer" }, true);
    const result = loadSessionData("user123");
    expect(result?.completed).toBe(true);
  });
});
