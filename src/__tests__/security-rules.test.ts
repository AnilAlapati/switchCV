import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "switchcv-test-rules";
const RULES_PATH = path.resolve(__dirname, "../../firestore.rules");

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load the rules file
  const rules = fs.readFileSync(RULES_PATH, "utf8");

  // Parse emulator host/port from environment or default
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

  const [host, portStr] = emulatorHost.split(":");
  const port = parseInt(portStr || "8080", 10);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host,
      port,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe.skip("Firestore Security Rules", () => {
  // Helpers
  const getContext = (userId?: string, role?: string) => {
    if (!userId) return testEnv.unauthenticatedContext();
    const token = role ? { role } : undefined;
    return testEnv.authenticatedContext(userId, token);
  };

  const getDb = (userId?: string, role?: string) => {
    return getContext(userId, role).firestore();
  };

  describe("Collection: users", () => {
    const userId = "user_123";
    const otherUserId = "user_456";

    it("allows owner to read their own profile", async () => {
      const db = getDb(userId);
      await assertSucceeds(db.collection("users").doc(userId).get());
    });

    it("denies access to other user's profile", async () => {
      const db = getDb(userId);
      await assertFails(db.collection("users").doc(otherUserId).get());
    });

    it("allows owner to write strict fields", async () => {
      const db = getDb(userId);
      await assertSucceeds(
        db.collection("users").doc(userId).set({
          uid: userId,
          email: "test@example.com",
          role: "jobseeker",
          subscriptionTier: "basic",
          isRecruiter: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it("denies writing unauthorized fields", async () => {
      const db = getDb(userId);
      await assertFails(
        db.collection("users").doc(userId).set({
          uid: userId,
          email: "test@example.com",
          isAdmin: true, // Forbidden field
        })
      );
    });
  });

  describe("Collection: resumes", () => {
    const ownerId = "seeker_123";
    const recruiterId = "recruiter_999";
    const otherId = "stranger_000";
    const resumeId = "resume_abc";

    const setupResume = async (
      isPublic: boolean = false,
      isBeingEdited: boolean = false
    ) => {
      // Admin setup to bypass rules
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("resumes").doc(resumeId).set({
          userId: ownerId,
          isPublic,
          isBeingEdited,
          title: "My Resume",
        });
      });
    };

    it("allows owner to read own resume", async () => {
      await setupResume(false, false);
      const db = getDb(ownerId);
      await assertSucceeds(db.collection("resumes").doc(resumeId).get());
    });

    it("denies non-owner read on private resume", async () => {
      await setupResume(false, false);
      const db = getDb(otherId);
      await assertFails(db.collection("resumes").doc(resumeId).get());
    });

    it("allows recruiter to read public published resume", async () => {
      await setupResume(true, false); // Public, Not editing
      const db = getDb(recruiterId, "recruiter");
      await assertSucceeds(db.collection("resumes").doc(resumeId).get());
    });

    it("denies recruiter read if resume is being edited", async () => {
      await setupResume(true, true); // Public, BUT being edited
      const db = getDb(recruiterId, "recruiter");
      await assertFails(db.collection("resumes").doc(resumeId).get());
    });

    it("denies basic user (non-recruiter) read on public resume", async () => {
      await setupResume(true, false);
      const db = getDb(otherId, "jobseeker");
      await assertFails(db.collection("resumes").doc(resumeId).get());
    });

    it("denies client write access (server-side only)", async () => {
      const db = getDb(ownerId);
      await assertFails(
        db.collection("resumes").doc("new_resume").set({ userId: ownerId })
      );
    });
  });

  describe("Collection: drafts", () => {
    const userId = "user_123";
    const draftId = "draft_789";

    it("allows owner to read/write drafts", async () => {
      const db = getDb(userId);
      await assertSucceeds(
        db.collection("drafts").doc(draftId).set({
          userId,
          content: "Draft content",
        })
      );
      await assertSucceeds(db.collection("drafts").doc(draftId).get());
    });

    it("denies others from accessing drafts", async () => {
      // Create draft first
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection("drafts").doc(draftId).set({ userId });
      });

      const db = getDb("other_user");
      await assertFails(db.collection("drafts").doc(draftId).get());
    });
  });

  describe("Collection: recruiterRequests", () => {
    const recruiterId = "recruiter_1";
    const candidateId = "candidate_1";
    const requestId = "req_1";

    it("allows recruiter to create a request", async () => {
      const db = getDb(recruiterId, "recruiter");
      await assertSucceeds(
        db.collection("recruiterRequests").doc(requestId).set({
          fromRecruiter: { recruiterId },
          toUserId: candidateId,
          status: "pending",
        })
      );
    });

    it("allows candidate to read their requests", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx
          .firestore()
          .collection("recruiterRequests")
          .doc(requestId)
          .set({
            fromRecruiter: { recruiterId },
            toUserId: candidateId,
            status: "pending",
          });
      });

      const db = getDb(candidateId);
      await assertSucceeds(
        db.collection("recruiterRequests").doc(requestId).get()
      );
    });
  });

  describe("System Collections", () => {
    it("denies all access to /system", async () => {
      const db = getDb("admin_user", "admin"); // Even admin client shouldn't write to system directly usually, or maybe rules allow false?
      // Rules say: match /system/{document=**} { allow read: if false; allow write: if false; }
      await assertFails(db.collection("system").add({ test: 1 }));
      await assertFails(db.collection("system").get());
    });
  });
});
