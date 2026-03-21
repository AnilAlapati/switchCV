/**
 * Conversation Storage Service — Unit Tests
 *
 * Validates the persistence and retrieval of conversation sessions,
 * mocking firebase-admin Firestore operations.
 */

// ============================================================================
// MOCKS
// ============================================================================

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();
const mockLimit = jest.fn();
const mockOrderBy = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

// Wire up the Firestore chain: collection().doc().collection().doc().set()
mockCollection.mockReturnValue({ doc: mockDoc });
mockDoc.mockReturnValue({
  collection: mockCollection,
  set: mockSet,
});

// ============================================================================
// IMPORTS
// ============================================================================

import {
  persistConversationSession,
  getConversationSessions,
  type ConversationSessionDoc,
} from "@/lib/services/conversationStorageService";

// ============================================================================
// FIXTURES
// ============================================================================

function buildSession(
  overrides?: Partial<ConversationSessionDoc>,
): ConversationSessionDoc {
  return {
    sessionId: "session-abc",
    userId: "user-123",
    createdAt: "2026-03-21T03:00:00.000Z",
    updatedAt: "2026-03-21T03:05:00.000Z",
    turnCount: 3,
    messages: [
      {
        role: "assistant",
        content: "What is your name?",
        timestamp: "2026-03-21T03:00:00.000Z",
      },
      {
        role: "user",
        content: "Alex Johnson",
        timestamp: "2026-03-21T03:01:00.000Z",
      },
      {
        role: "assistant",
        content: "Great! What is your email?",
        timestamp: "2026-03-21T03:02:00.000Z",
      },
    ],
    metadata: {
      userTier: "premium",
      pipeline: "v2_structured",
    },
    outcome: "in_progress",
    expiresAt: "",
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("conversationStorageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-wire the chain after clearAllMocks
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({
      collection: mockCollection,
      set: mockSet,
    });
  });

  describe("persistConversationSession", () => {
    it("calls Firestore set with merge: true", async () => {
      const session = buildSession();

      await persistConversationSession(session);

      expect(mockSet).toHaveBeenCalledTimes(1);
      const [docData, options] = mockSet.mock.calls[0];
      expect(options).toEqual({ merge: true });
      expect(docData.sessionId).toBe("session-abc");
      expect(docData.userId).toBe("user-123");
      expect(docData.messages).toHaveLength(3);
    });

    it("computes expiresAt when not provided", async () => {
      const session = buildSession({ expiresAt: "" });

      await persistConversationSession(session);

      const [docData] = mockSet.mock.calls[0];
      // Should be 90 days after createdAt
      const expected = new Date("2026-03-21T03:00:00.000Z");
      expected.setDate(expected.getDate() + 90);
      expect(docData.expiresAt).toBe(expected.toISOString());
    });

    it("preserves provided expiresAt", async () => {
      const session = buildSession({
        expiresAt: "2026-12-31T00:00:00.000Z",
      });

      await persistConversationSession(session);

      const [docData] = mockSet.mock.calls[0];
      expect(docData.expiresAt).toBe("2026-12-31T00:00:00.000Z");
    });

    it("does not throw when Firestore write fails", async () => {
      mockSet.mockRejectedValueOnce(new Error("Firestore unavailable"));
      const session = buildSession();

      // Should not throw
      await expect(
        persistConversationSession(session),
      ).resolves.toBeUndefined();
    });

    it("navigates the correct Firestore path", async () => {
      const session = buildSession();

      await persistConversationSession(session);

      // First call: collection("users")
      expect(mockCollection).toHaveBeenCalledWith("users");
      // Then: doc("user-123")
      expect(mockDoc).toHaveBeenCalledWith("user-123");
      // Then: collection("conversationSessions")
      expect(mockCollection).toHaveBeenCalledWith("conversationSessions");
      // Then: doc("session-abc")
      expect(mockDoc).toHaveBeenCalledWith("session-abc");
    });
  });

  describe("getConversationSessions", () => {
    it("returns session documents for a user", async () => {
      const sessionData = buildSession();
      const mockSnapshot = {
        docs: [{ data: () => sessionData }],
      };
      mockGet.mockResolvedValue(mockSnapshot);
      mockLimit.mockReturnValue({ get: mockGet });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockCollection.mockReturnValueOnce({ doc: mockDoc });
      mockDoc.mockReturnValueOnce({
        collection: jest.fn().mockReturnValue({
          orderBy: mockOrderBy,
        }),
      });

      const result = await getConversationSessions("user-123");

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe("session-abc");
    });

    it("applies default limit of 50", async () => {
      const mockSnapshot = { docs: [] };
      mockGet.mockResolvedValue(mockSnapshot);
      mockLimit.mockReturnValue({ get: mockGet });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockCollection.mockReturnValueOnce({ doc: mockDoc });
      mockDoc.mockReturnValueOnce({
        collection: jest.fn().mockReturnValue({
          orderBy: mockOrderBy,
        }),
      });

      await getConversationSessions("user-123");

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it("applies custom limit", async () => {
      const mockSnapshot = { docs: [] };
      mockGet.mockResolvedValue(mockSnapshot);
      mockLimit.mockReturnValue({ get: mockGet });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockCollection.mockReturnValueOnce({ doc: mockDoc });
      mockDoc.mockReturnValueOnce({
        collection: jest.fn().mockReturnValue({
          orderBy: mockOrderBy,
        }),
      });

      await getConversationSessions("user-123", { limit: 10 });

      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });
});
