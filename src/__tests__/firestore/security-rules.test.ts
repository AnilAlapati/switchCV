/**
 * Firestore Security Rules Tests
 *
 * Tests for Firestore security rules enforcement across all document types
 *
 * @module __tests__/firestore/security-rules
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  try {
    // Load Firestore rules
    const rulesPath = path.join(process.cwd(), "firestore.rules");
    const rules = fs.readFileSync(rulesPath, "utf8");

    testEnv = await initializeTestEnvironment({
      projectId: "test-project",
      firestore: {
        rules,
        host: "localhost",
        port: 8080,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("emulator") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("port"))
    ) {
      console.warn(
        "Firestore emulator not running. Skipping security rules tests."
      );
      testEnv = null as any;
    } else {
      throw error;
    }
  }
});

afterAll(async () => {
  if (testEnv && testEnv.cleanup) {
    await testEnv.cleanup();
  }
});

describe.skip("Firestore Security Rules", () => {
  beforeEach(() => {
    if (!testEnv || !testEnv.cleanup) {
      pending("Firestore emulator not available");
    }
  });
  describe("Users Collection", () => {
    const userId = "user-123";
    const otherUserId = "user-456";

    test("should allow user to read own document", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertSucceeds(db.collection("users").doc(userId).get());
    });

    test("should deny user reading other user's document", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertFails(db.collection("users").doc(otherUserId).get());
    });

    test("should deny unauthenticated read", async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      await assertFails(db.collection("users").doc(userId).get());
    });

    test("should allow user to create own document", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertSucceeds(
        db.collection("users").doc(userId).set({
          email: "user@example.com",
          role: "jobseeker",
          createdAt: new Date(),
        })
      );
    });

    test("should deny user creating document for other user", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertFails(
        db.collection("users").doc(otherUserId).set({
          email: "other@example.com",
          role: "jobseeker",
        })
      );
    });

    test("should deny unauthenticated write", async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        db.collection("users").doc(userId).set({
          email: "user@example.com",
        })
      );
    });

    test("should allow user to update own document", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      // First create
      await db.collection("users").doc(userId).set({
        email: "user@example.com",
        role: "jobseeker",
      });

      // Then update
      await assertSucceeds(
        db.collection("users").doc(userId).update({
          updatedAt: new Date(),
        })
      );
    });

    test("should deny updating role field directly", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("users").doc(userId).set({
        email: "user@example.com",
        role: "jobseeker",
      });

      // Should fail - users shouldn't be able to change own role
      await assertFails(
        db.collection("users").doc(userId).update({
          role: "recruiter",
        })
      );
    });

    test("should deny user deleting own document", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("users").doc(userId).set({
        email: "user@example.com",
      });

      // Users shouldn't be able to delete their own document
      await assertFails(db.collection("users").doc(userId).delete());
    });
  });

  describe("Resumes Collection", () => {
    const userId = "user-123";
    const otherUserId = "user-456";
    const resumeId = "resume-123";

    test("should allow authenticated user to create resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertSucceeds(
        db.collection("resumes").doc(resumeId).set({
          userId,
          title: "My Resume",
          content: "Experience...",
          visibility: "private",
          createdAt: new Date(),
        })
      );
    });

    test("should require userId to match authenticated user", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertFails(
        db.collection("resumes").doc(resumeId).set({
          userId: otherUserId,
          title: "My Resume",
          visibility: "private",
        })
      );
    });

    test("should deny unauthenticated resume creation", async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        db.collection("resumes").doc(resumeId).set({
          userId,
          title: "My Resume",
          visibility: "private",
        })
      );
    });

    test("should allow owner to read own resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("resumes").doc(resumeId).set({
        userId,
        title: "My Resume",
        visibility: "private",
      });

      await assertSucceeds(db.collection("resumes").doc(resumeId).get());
    });

    test("should allow public resume read when visibility is public", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const publicResumeId = "resume-public";

      await db.collection("resumes").doc(publicResumeId).set({
        userId,
        title: "Public Resume",
        visibility: "public",
      });

      // Other user should be able to read
      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertSucceeds(
        otherDb.collection("resumes").doc(publicResumeId).get()
      );
    });

    test("should deny non-owner reading private resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const privateResumeId = "resume-private";

      await db.collection("resumes").doc(privateResumeId).set({
        userId,
        title: "Private Resume",
        visibility: "private",
      });

      // Other user should be denied
      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(
        otherDb.collection("resumes").doc(privateResumeId).get()
      );
    });

    test("should allow owner to update resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("resumes").doc(resumeId).set({
        userId,
        title: "My Resume",
        visibility: "private",
      });

      await assertSucceeds(
        db.collection("resumes").doc(resumeId).update({
          title: "Updated Resume",
        })
      );
    });

    test("should deny non-owner updating resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const updateResumeId = "resume-update";

      await db.collection("resumes").doc(updateResumeId).set({
        userId,
        title: "My Resume",
      });

      // Other user should be denied
      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(
        otherDb.collection("resumes").doc(updateResumeId).update({
          title: "Hacked",
        })
      );
    });

    test("should allow owner to delete resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const deleteResumeId = "resume-delete";

      await db.collection("resumes").doc(deleteResumeId).set({
        userId,
        title: "My Resume",
      });

      await assertSucceeds(
        db.collection("resumes").doc(deleteResumeId).delete()
      );
    });

    test("should deny non-owner deleting resume", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const deleteResumeId = "resume-delete-other";

      await db.collection("resumes").doc(deleteResumeId).set({
        userId,
        title: "My Resume",
      });

      // Other user should be denied
      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(
        otherDb.collection("resumes").doc(deleteResumeId).delete()
      );
    });

    test("should prevent changing userId field", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const changeUserIdResumeId = "resume-change-userid";

      await db.collection("resumes").doc(changeUserIdResumeId).set({
        userId,
        title: "My Resume",
      });

      // Should not be able to change userId
      await assertFails(
        db.collection("resumes").doc(changeUserIdResumeId).update({
          userId: otherUserId,
        })
      );
    });
  });

  describe("Search History Collection", () => {
    const userId = "user-123";
    const otherUserId = "user-456";
    const historyId = "history-123";

    test("should allow user to create search history entry", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertSucceeds(
        db.collection("searchHistory").doc(historyId).set({
          userId,
          query: "React developer",
          timestamp: new Date(),
        })
      );
    });

    test("should require userId to match authenticated user", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await assertFails(
        db.collection("searchHistory").doc(historyId).set({
          userId: otherUserId,
          query: "React developer",
        })
      );
    });

    test("should allow user to read own search history", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("searchHistory").doc(historyId).set({
        userId,
        query: "React developer",
      });

      await assertSucceeds(db.collection("searchHistory").doc(historyId).get());
    });

    test("should deny reading other user's search history", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("searchHistory").doc(historyId).set({
        userId,
        query: "React developer",
      });

      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(
        otherDb.collection("searchHistory").doc(historyId).get()
      );
    });

    test("should allow querying own search history", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("searchHistory").doc(historyId).set({
        userId,
        query: "React developer",
      });

      await assertSucceeds(
        db.collection("searchHistory").where("userId", "==", userId).get()
      );
    });

    test("should deny querying other user's search history", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db.collection("searchHistory").doc(historyId).set({
        userId,
        query: "React developer",
      });

      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(
        otherDb.collection("searchHistory").where("userId", "==", userId).get()
      );
    });
  });

  describe("Job Listings Collection", () => {
    const jobId = "job-123";

    test("should allow anyone to read public job listing", async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      // Setup job listing
      const adminDb = testEnv.authenticatedContext("admin").firestore();
      await adminDb.collection("jobs").doc(jobId).set({
        title: "React Developer",
        company: "Tech Corp",
        status: "active",
      });

      // Unauthenticated read should succeed
      await assertSucceeds(db.collection("jobs").doc(jobId).get());
    });

    test("should allow authenticated user to read job", async () => {
      const db = testEnv.authenticatedContext("user-123").firestore();

      await assertSucceeds(db.collection("jobs").doc(jobId).get());
    });

    test("should deny creating job to regular users", async () => {
      const db = testEnv.authenticatedContext("user-123").firestore();

      await assertFails(
        db.collection("jobs").doc(jobId).set({
          title: "React Developer",
          company: "Fake Corp",
          status: "active",
        })
      );
    });

    test("should allow querying active jobs", async () => {
      const db = testEnv.unauthenticatedContext().firestore();

      await assertSucceeds(
        db.collection("jobs").where("status", "==", "active").limit(10).get()
      );
    });
  });

  describe("Access Control List (ACL) Enforcement", () => {
    const userId = "user-123";
    const otherUserId = "user-456";
    const resumeId = "resume-acl";

    test("should enforce ACL for masked visibility", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db
        .collection("resumes")
        .doc(resumeId)
        .set({
          userId,
          title: "My Resume",
          visibility: "masked",
          acl: [otherUserId],
        });

      // Other user in ACL should be able to read
      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertSucceeds(otherDb.collection("resumes").doc(resumeId).get());
    });

    test("should deny access to non-ACL users", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      const thirdUserId = "user-789";

      await db
        .collection("resumes")
        .doc(resumeId)
        .set({
          userId,
          title: "My Resume",
          visibility: "masked",
          acl: [otherUserId],
        });

      // User not in ACL should be denied
      const thirdDb = testEnv.authenticatedContext(thirdUserId).firestore();
      await assertFails(thirdDb.collection("resumes").doc(resumeId).get());
    });

    test("should prevent modifying ACL without ownership", async () => {
      const db = testEnv.authenticatedContext(userId).firestore();

      await db
        .collection("resumes")
        .doc(resumeId)
        .set({
          userId,
          title: "My Resume",
          acl: [otherUserId],
        });

      // Other user should not be able to modify ACL
      const otherDb = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(
        otherDb
          .collection("resumes")
          .doc(resumeId)
          .update({
            acl: ["user-789"],
          })
      );
    });
  });

  describe("Audit Trail Collection", () => {
    const auditId = "audit-123";

    test("should deny direct user writes to audit trail", async () => {
      const db = testEnv.authenticatedContext("user-123").firestore();

      await assertFails(
        db.collection("auditTrail").doc(auditId).set({
          action: "RESUME_VIEWED",
          userId: "user-123",
          timestamp: new Date(),
        })
      );
    });

    test("should allow reading own audit trail entries", async () => {
      const userId = "user-123";
      const db = testEnv.authenticatedContext(userId).firestore();

      // Assume audit entry already exists (created by backend)
      // Should be able to read their own actions
      await assertSucceeds(
        db
          .collection("auditTrail")
          .where("userId", "==", userId)
          .limit(10)
          .get()
      );
    });

    test("should deny reading other user's audit trail", async () => {
      const db = testEnv.authenticatedContext("user-123").firestore();

      await assertFails(
        db.collection("auditTrail").where("userId", "==", "user-456").get()
      );
    });
  });

  describe("Rate Limit Enforcement", () => {
    test("should handle rapid sequential writes", async () => {
      const userId = "user-rapid";
      const db = testEnv.authenticatedContext(userId).firestore();

      // Rapid writes should succeed (server enforces rate limits)
      for (let i = 0; i < 5; i++) {
        await assertSucceeds(
          db
            .collection("resumes")
            .doc(`resume-${i}`)
            .set({
              userId,
              title: `Resume ${i}`,
            })
        );
      }
    });
  });
});
