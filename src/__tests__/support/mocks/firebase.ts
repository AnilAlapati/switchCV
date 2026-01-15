/**
 * Firebase mocks for testing
 * Provides mock implementations of Firebase Auth, Firestore, etc.
 */

import { jest } from "@jest/globals";

// Mock Firebase Auth
export const mockFirebaseAuth = {
  currentUser: {
    uid: "test-user-id",
    email: "test@example.com",
    getIdToken: (jest.fn() as any).mockResolvedValue("test-token"),
    getIdTokenResult: (jest.fn() as any).mockResolvedValue({
      token: "test-token",
      claims: { admin: false },
    } as any),
  } as any,
};

// Mock getAuth function
export const mockGetAuth = jest.fn().mockReturnValue(mockFirebaseAuth);

// Mock Firebase Firestore
export const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  writeBatch: jest.fn(),
};

export const mockGetFirestore = jest.fn().mockReturnValue(mockFirestore);

// Mock Firebase functions
export const mockGetFunctions = jest.fn().mockReturnValue({
  httpsCallable: jest.fn(),
});

// Setup function for Firebase mocks
export function setupFirebaseMocks() {
  jest.clearAllMocks();
  mockGetAuth.mockReturnValue(mockFirebaseAuth);
  mockGetFirestore.mockReturnValue(mockFirestore);
}

// Helper to reset all Firebase mocks
export function resetFirebaseMocks() {
  jest.clearAllMocks();
  mockGetAuth.mockReturnValue(mockFirebaseAuth);
  mockGetFirestore.mockReturnValue(mockFirestore);
}

// Helper to set current user for tests
export function setMockCurrentUser(uid: string, email: string) {
  (mockFirebaseAuth.currentUser as any).uid = uid;
  (mockFirebaseAuth.currentUser as any).email = email;
}

// Helper to make getIdToken fail
export function setMockGetIdTokenError(error: Error) {
  (mockFirebaseAuth.currentUser as any).getIdToken = (jest.fn() as any)
    .mockRejectedValue(error as any);
}

// Helper to set up Firestore document response
export function mockFirestoreDoc(data: any) {
  mockFirestore.getDoc = (jest.fn() as any).mockResolvedValue({
    exists: () => !!data,
    data: () => data,
    id: "test-doc-id",
  } as any);
}

// Helper to set up Firestore collection response
export function mockFirestoreCollection(docs: any[]) {
  mockFirestore.getDocs = (jest.fn() as any).mockResolvedValue({
    docs: docs.map((data) => ({
      data: () => data,
      id: data.id || "test-doc-id",
    })),
    empty: docs.length === 0,
    size: docs.length,
  } as any);
}

// Mock getDoc function for testing
export const mockGetDoc = (jest.fn() as any).mockResolvedValue({
  exists: () => true,
  data: () => ({}),
  id: "test-doc-id",
} as any);

// Mock serverTimestamp function
export const mockServerTimestamp = jest.fn().mockReturnValue({
  toMillis: () => Date.now(),
});

// Helper to create a mock Firebase user object
export function createMockFirebaseUser(overrides?: Partial<any>) {
  return {
    uid: "test-uid",
    email: "test@example.com",
    emailVerified: false,
    displayName: null,
    photoURL: null,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    phoneNumber: null,
    tenantId: null,
    reloadUserInfo: async () => { },
    reload: (jest.fn() as any).mockResolvedValue(undefined as any),
    getIdToken: (jest.fn() as any).mockResolvedValue("test-token"),
    getIdTokenResult: (jest.fn() as any).mockResolvedValue({
      token: "test-token",
      claims: { admin: false },
      expirationTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      signInProvider: "password",
      signInSecond: Math.floor(Date.now() / 1000),
    } as any),
    delete: (jest.fn() as any).mockResolvedValue(undefined as any),
    toJSON: jest.fn().mockReturnValue({}),
    ...overrides,
  } as any;
}
