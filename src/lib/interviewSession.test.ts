/**
 * Interview Session Manager Tests
 */

import {
  createInterviewSession,
  submitAnswer,
  calculateSessionScore,
  getNextQuestion,
  completeSession,
  getInterviewTips,
} from "@/lib/interviewSession";

describe("Interview Session Manager", () => {
  const userId = "test-user-123";
  const jobTitle = "Senior Software Engineer";

  describe("createInterviewSession", () => {
    it("should create session with correct properties", () => {
      const session = createInterviewSession(userId, jobTitle);

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.jobTitle).toBe(jobTitle);
      expect(session.status).toBe("pending");
      expect(session.questions.length).toBeGreaterThan(0);
      expect(session.answers).toEqual([]);
    });

    it("should include all required fields", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        "Job description",
        "Tech Company",
        5
      );

      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.duration).toBeGreaterThan(0);
      expect(session.jobDescription).toBe("Job description");
      expect(session.companyName).toBe("Tech Company");
    });

    it("should generate specified number of questions", () => {
      const session5 = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        5
      );
      const session3 = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );

      expect(session5.questions.length).toBe(5);
      expect(session3.questions.length).toBe(3);
    });

    it("should have unique session IDs", () => {
      const session1 = createInterviewSession(userId, jobTitle);
      const session2 = createInterviewSession(userId, jobTitle);

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe("submitAnswer", () => {
    it("should create valid answer object", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );
      const answer = "This is my answer to the question";
      const duration = 60;

      const interviewAnswer = submitAnswer(session, 0, answer, duration);

      expect(interviewAnswer.questionId).toBeDefined();
      expect(interviewAnswer.answer).toBe(answer);
      expect(interviewAnswer.duration).toBe(duration);
      expect(interviewAnswer.score).toBeDefined();
    });

    it("should score answer based on length and time", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );

      const shortAnswer = submitAnswer(session, 0, "Yes", 30);
      const longAnswer = submitAnswer(
        session,
        0,
        "This is a comprehensive answer with multiple details and examples to thoroughly address the question",
        180
      );

      expect(longAnswer.score ?? 0).toBeGreaterThan(shortAnswer.score ?? 0);
    });

    it("should throw on invalid question index", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );

      expect(() => submitAnswer(session, 999, "answer", 60)).toThrow();
    });

    it("should assign timestamp to answer", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );
      const before = new Date();

      const answer = submitAnswer(session, 0, "answer", 60);

      const after = new Date();
      expect(answer.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(answer.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("calculateSessionScore", () => {
    it("should return 0 for empty answers", () => {
      const score = calculateSessionScore([]);
      expect(score).toBe(0);
    });

    it("should average multiple scores", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );

      const answer1 = submitAnswer(session, 0, "short", 30);
      const answer2 = submitAnswer(session, 1, "medium length answer here", 60);
      const answer3 = submitAnswer(
        session,
        2,
        "Long comprehensive answer with lots of detail and examples",
        120
      );

      const score = calculateSessionScore([answer1, answer2, answer3]);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should weight completeness and time usage", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        2
      );

      const rushed = submitAnswer(session, 0, "quick answer", 10);
      const balanced = submitAnswer(
        session,
        1,
        "This is a well-thought-out answer with adequate detail",
        120
      );

      const rushedScore = calculateSessionScore([rushed]);
      const balancedScore = calculateSessionScore([balanced]);

      expect(balancedScore).toBeGreaterThan(rushedScore);
    });
  });

  describe("getNextQuestion", () => {
    it("should return next question in sequence", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        5
      );

      const response = getNextQuestion(session, 0);

      expect(response.nextQuestion).toBeDefined();
      expect(response.currentQuestionIndex).toBe(1);
      expect(response.sessionStatus).toBe("in-progress");
    });

    it("should mark session complete on last question", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );

      const response = getNextQuestion(session, 2);

      expect(response.nextQuestion).toBeUndefined();
      expect(response.currentQuestionIndex).toBe(3);
      expect(response.sessionStatus).toBe("completed");
    });

    it("should track progress correctly", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        5
      );

      const response1 = getNextQuestion(session, 0);
      const response2 = getNextQuestion(session, 1);
      const response3 = getNextQuestion(session, 4);

      expect(response1.currentQuestionIndex).toBe(1);
      expect(response2.currentQuestionIndex).toBe(2);
      expect(response3.currentQuestionIndex).toBe(5);
    });
  });

  describe("completeSession", () => {
    it("should mark session as completed", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );
      const answer1 = submitAnswer(session, 0, "answer one", 60);
      const answer2 = submitAnswer(session, 1, "answer two", 60);
      const answer3 = submitAnswer(session, 2, "answer three", 60);

      const completed = completeSession(session, [answer1, answer2, answer3]);

      expect(completed.status).toBe("completed");
      expect(completed.endTime).toBeDefined();
      expect(completed.score).toBeDefined();
    });

    it("should include feedback on completion", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        2
      );
      const answer1 = submitAnswer(session, 0, "good answer here", 120);
      const answer2 = submitAnswer(session, 1, "another good answer", 120);

      const completed = completeSession(session, [answer1, answer2]);

      expect(completed.feedback).toBeDefined();
      const feedbackText = completed.feedback || "";
      expect(feedbackText.length).toBeGreaterThan(0);
    });

    it("should calculate final score", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        2
      );
      const answer1 = submitAnswer(session, 0, "test", 60);
      const answer2 = submitAnswer(session, 1, "test", 60);

      const completed = completeSession(session, [answer1, answer2]);

      expect(completed.score).toBeGreaterThanOrEqual(0);
      expect(completed.score).toBeLessThanOrEqual(100);
    });
  });

  describe("getInterviewTips", () => {
    it("should return tips object with all categories", () => {
      const tips = getInterviewTips(jobTitle);

      expect(tips.general).toBeDefined();
      expect(tips.technical).toBeDefined();
      expect(tips.behavioral).toBeDefined();
      expect(tips.roleSpecific).toBeDefined();
      expect(tips.communication).toBeDefined();
      expect(tips.confidence).toBeDefined();
    });

    it("should have non-empty tip arrays", () => {
      const tips = getInterviewTips();

      Object.values(tips).forEach((tipArray) => {
        expect(Array.isArray(tipArray)).toBe(true);
        expect(tipArray.length).toBeGreaterThan(0);
      });
    });

    it("should provide role-specific tips for engineers", () => {
      const tips = getInterviewTips("Senior Software Engineer");

      const roleSpecific = tips.roleSpecific;
      expect(
        roleSpecific.some((tip) => tip.toLowerCase().includes("tech"))
      ).toBe(true);
    });

    it("should provide tips for managers", () => {
      const tips = getInterviewTips("Engineering Manager");

      const roleSpecific = tips.roleSpecific;
      expect(roleSpecific.length).toBeGreaterThan(0);
    });

    it("should provide generic tips for unknown roles", () => {
      const tips = getInterviewTips("Random Role");

      const roleSpecific = tips.roleSpecific;
      expect(roleSpecific.length).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    it("should complete full interview session", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        3
      );

      expect(session.status).toBe("pending");
      expect(session.questions.length).toBe(3);

      const answer1 = submitAnswer(session, 0, "My first answer", 90);
      const answer2 = submitAnswer(session, 1, "My second answer", 100);
      const answer3 = submitAnswer(session, 2, "My third answer", 110);

      const completed = completeSession(session, [answer1, answer2, answer3]);

      expect(completed.status).toBe("completed");
      expect(completed.score).toBeGreaterThan(0);
      expect(completed.feedback).toBeDefined();
    });

    it("should track progress throughout session", () => {
      const session = createInterviewSession(
        userId,
        jobTitle,
        undefined,
        undefined,
        5
      );

      expect(session.questions.length).toBe(5);

      const response1 = getNextQuestion(session, 0);
      expect(response1.currentQuestionIndex).toBe(1);
      expect(response1.sessionStatus).toBe("in-progress");

      const response5 = getNextQuestion(session, 4);
      expect(response5.currentQuestionIndex).toBe(5);
      expect(response5.sessionStatus).toBe("completed");
    });

    it("should handle different job roles appropriately", () => {
      const engineerSession = createInterviewSession(
        userId,
        "Software Engineer",
        undefined,
        undefined,
        5
      );
      const managerSession = createInterviewSession(
        userId,
        "Engineering Manager",
        undefined,
        undefined,
        5
      );

      const engineerCategories = engineerSession.questions.map(
        (q) => q.category
      );
      const managerCategories = managerSession.questions.map((q) => q.category);

      expect(engineerCategories).toContain("technical");
      expect(managerCategories).toContain("role-specific");
    });
  });
});
