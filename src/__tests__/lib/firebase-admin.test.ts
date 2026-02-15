import { logger } from "@/lib/logger";

// Unmock the module we are testing because it is globally mocked in jest.setup.js
jest.unmock("@/lib/firebase-admin");
jest.unmock("../../lib/firebase-admin");

// We don't use global jest.mock here because we want to reset modules per test
// and define specific mock behaviors (like apps array state) in each test.

describe("Firebase Admin Initialization", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules(); // CRITICAL: Clears the cache so the module re-runs
    jest.dontMock("node:fs");
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "valid-project-id";
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_FILE;

    // Default mock for logger
    jest.doMock("@/lib/logger", () => ({
      logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      },
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should throw error if NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing", () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Mock firebase-admin with empty apps array to trigger initialization logic
    jest.doMock("firebase-admin", () => ({
      apps: [],
      credential: {
        cert: jest.fn(),
      },
      initializeApp: jest.fn(),
      firestore: jest.fn(),
      auth: jest.fn(),
    }));

    expect(() => {
      require("../../lib/firebase-admin");
    }).toThrow("Missing required environment variable");
  });

  it("should initialize with service account if provided", () => {
    const serviceAccount = {
      private_key: "key",
      project_id: "valid-project-id",
      client_email: "test@test.com",
    };
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);

    const mockInitializeApp = jest.fn();
    const mockCert = jest.fn(() => "mock-cert-credential");

    jest.doMock("firebase-admin", () => ({
      apps: [],
      credential: {
        cert: mockCert,
      },
      initializeApp: mockInitializeApp,
      firestore: jest.fn(),
      auth: jest.fn(),
    }));

    const { initializeFirebaseAdmin } = require("../../lib/firebase-admin");
    initializeFirebaseAdmin();

    expect(mockCert).toHaveBeenCalledWith(serviceAccount);
    expect(mockInitializeApp).toHaveBeenCalledWith({
      credential: "mock-cert-credential",
      projectId: "valid-project-id",
    });
  });

  it("should initialize with service account from file when env JSON is missing", () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE = "/secrets/service-account.json";

    const serviceAccount = {
      private_key: "file-key",
      project_id: "valid-project-id",
      client_email: "file@test.com",
    };

    const mockInitializeApp = jest.fn();
    const mockCert = jest.fn(() => "mock-cert-credential");
    const mockExistsSync = jest.fn((path: string) => path === "/secrets/service-account.json");
    const mockReadFileSync = jest.fn(() => JSON.stringify(serviceAccount));

    jest.doMock("node:fs", () => ({
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    }));

    jest.doMock("firebase-admin", () => ({
      apps: [],
      credential: {
        cert: mockCert,
      },
      initializeApp: mockInitializeApp,
      firestore: jest.fn(),
      auth: jest.fn(),
    }));

    const { initializeFirebaseAdmin } = require("../../lib/firebase-admin");
    initializeFirebaseAdmin();

    expect(mockExistsSync).toHaveBeenCalledWith("/secrets/service-account.json");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/secrets/service-account.json",
      "utf8",
    );
    expect(mockCert).toHaveBeenCalledWith(serviceAccount);
    expect(mockInitializeApp).toHaveBeenCalledWith({
      credential: "mock-cert-credential",
      projectId: "valid-project-id",
    });
  });

  it("should initialize with ADC if service account is missing", () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;

    const mockInitializeApp = jest.fn();
    const mockCert = jest.fn();

    jest.doMock("firebase-admin", () => ({
      apps: [],
      credential: {
        cert: mockCert,
      },
      initializeApp: mockInitializeApp,
      firestore: jest.fn(),
      auth: jest.fn(),
    }));

    const { initializeFirebaseAdmin } = require("../../lib/firebase-admin");
    initializeFirebaseAdmin();

    expect(mockCert).not.toHaveBeenCalled();
    expect(mockInitializeApp).toHaveBeenCalledWith({
      projectId: "valid-project-id",
    });
  });

  it("should not re-initialize if apps already exist", () => {
    const mockInitializeApp = jest.fn();

    jest.doMock("firebase-admin", () => ({
      apps: [{ name: "[DEFAULT]" }], // Simulate existing app
      initializeApp: mockInitializeApp,
      firestore: jest.fn(),
      auth: jest.fn(),
    }));

    const { initializeFirebaseAdmin } = require("../../lib/firebase-admin");
    initializeFirebaseAdmin();

    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it("should export adminDb and adminAuth", () => {
    const mockFirestore = jest.fn(() => "mock-firestore");
    const mockAuth = jest.fn(() => "mock-auth");

    jest.doMock("firebase-admin", () => ({
      apps: ["existing-app"],
      credential: {
        cert: jest.fn(),
      },
      initializeApp: jest.fn(),
      firestore: mockFirestore,
      auth: mockAuth,
    }));

    const { adminDb, adminAuth } = require("../../lib/firebase-admin");

    expect(mockFirestore).toHaveBeenCalled();
    expect(mockAuth).toHaveBeenCalled();
    expect(adminDb).toBe("mock-firestore");
    expect(adminAuth).toBe("mock-auth");
  });
});
