// Mock Firebase modules before any imports
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "mock-app" })),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ name: "mock-auth" })),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ name: "mock-db" })),
}));

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(() => ({ name: "mock-storage" })),
}));

jest.mock("firebase/functions", () => ({
  getFunctions: jest.fn(() => ({ name: "mock-functions" })),
}));

// Import after mocks are set up
import app, { auth, db, storage, functions } from "../../lib/firebase";

describe("Firebase Configuration", () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set up mock environment variables
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "mock-api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN =
      "mock-project.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "mock-project";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
      "mock-project.appspot.com";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abcdef123456";
  });

  it("should export auth service", () => {
    expect(auth).toBeDefined();
  });

  it("should export firestore database service", () => {
    expect(db).toBeDefined();
  });

  it("should export storage service", () => {
    expect(storage).toBeDefined();
  });

  it("should export functions service", () => {
    expect(functions).toBeDefined();
  });

  it("should export default app instance", () => {
    expect(app).toBeDefined();
  });
});
