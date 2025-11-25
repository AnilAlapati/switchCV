/**
 * Comprehensive Firebase Mocks for Testing
 * Provides reusable mocks for Firestore, Auth, Cloud Functions, and more
 *
 * @remarks This file contains test utilities and is exempt from strict type checking
 */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

// Mock Firebase App
export const mockFirebaseApp = {
  name: "[DEFAULT]",
  automaticDataCollectionEnabled: true,
};

// Mock Firestore
export const mockFirestore = {
  app: mockFirebaseApp,
  _key: { path: { segments: [] } },
};

// Mock Firebase Auth
export const mockAuth = {
  app: mockFirebaseApp,
  name: "auth",
  currentUser: null,
};

// Mock User
export const mockUser = {
  uid: "test-user-123",
  email: "test@example.com",
  emailVerified: true,
  displayName: "Test User",
  photoURL: null,
  phoneNumber: null,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  getIdToken: jest.fn().mockResolvedValue("mock-token"),
  getIdTokenResult: jest.fn().mockResolvedValue({ token: "mock-token" }),
  reload: jest.fn().mockResolvedValue(undefined),
  toJSON: jest.fn().mockReturnValue({}),
  delete: jest.fn().mockResolvedValue(undefined),
  getDisplayName: jest.fn().mockReturnValue("Test User"),
  getEmail: jest.fn().mockReturnValue("test@example.com"),
  getPhoneNumber: jest.fn().mockReturnValue(null),
  getPhotoURL: jest.fn().mockReturnValue(null),
  getProviderData: jest.fn().mockReturnValue([]),
  getUid: jest.fn().mockReturnValue("test-user-123"),
  isEmailVerified: jest.fn().mockReturnValue(true),
  refreshToken: "mock-refresh-token",
};

// Helper function to create mock Firestore document data
export const createMockFirestoreDoc = (
  data: any = {},
  id = "test-doc-123"
) => ({
  id,
  exists: jest.fn().mockReturnValue(true),
  data: jest.fn().mockReturnValue(data),
  get: jest.fn((field: string) => data[field]),
});

// Helper function to create mock query snapshot
export const createMockQuerySnapshot = (docs: any[] = []) => ({
  docs:
    docs.length > 0
      ? docs.map((doc, index) => createMockFirestoreDoc(doc, `doc-${index}`))
      : [createMockFirestoreDoc({ id: "test-user-123" })],
  empty: docs.length === 0,
  size: docs.length || 1,
  docChanges: jest.fn().mockReturnValue([]),
  forEach: jest.fn((callback: Function) => {
    const docList = docs.length > 0 ? docs : [{ id: "test-user-123" }];
    docList.forEach((doc, index) =>
      callback(createMockFirestoreDoc(doc, `doc-${index}`))
    );
  }),
  query: { id: "users" },
  metadata: {
    hasPendingWrites: false,
    isFromCache: false,
  },
});

// Mock Firestore DocumentReference
export const mockDocRef: any = {
  firestore: mockFirestore,
  _key: { path: { segments: ["users", "test-user-123"] } },
  id: "test-user-123",
  parent: { id: "users" },
  path: "users/test-user-123",
  get: jest.fn().mockResolvedValue(
    createMockFirestoreDoc({
      uid: "test-user-123",
      email: "test@example.com",
    })
  ),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn(),
  onSnapshot: jest.fn((callback: Function) => {
    callback(createMockFirestoreDoc({ uid: "test-user-123" }));
    return jest.fn(); // unsubscribe
  }),
};

// Set up collection reference to return doc ref
mockDocRef.collection.mockReturnValue({
  doc: jest.fn().mockReturnValue(mockDocRef),
});

// Mock Firestore CollectionReference
export const mockCollectionRef: any = {
  firestore: mockFirestore,
  _key: { path: { segments: ["users"] } },
  id: "users",
  parent: null,
  path: "users",
  doc: jest.fn().mockReturnValue(mockDocRef),
  add: jest.fn().mockResolvedValue(mockDocRef),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  get: jest
    .fn()
    .mockResolvedValue(createMockQuerySnapshot([{ uid: "test-user-123" }])),
  onSnapshot: jest.fn((callback: Function) => {
    callback(createMockQuerySnapshot([{ uid: "test-user-123" }]));
    return jest.fn(); // unsubscribe
  }),
};

// Setup chainable where/orderBy/limit
const setupChainableQuery = () => ({
  orderBy: jest.fn(),
  limit: jest.fn(),
  get: jest
    .fn()
    .mockResolvedValue(createMockQuerySnapshot([{ uid: "test-user-123" }])),
  onSnapshot: jest.fn((callback: Function) => {
    callback(createMockQuerySnapshot([{ uid: "test-user-123" }]));
    return jest.fn();
  }),
});

mockCollectionRef.where.mockReturnValue(setupChainableQuery());
mockCollectionRef.orderBy.mockReturnValue(setupChainableQuery());
mockCollectionRef.limit.mockReturnValue(setupChainableQuery());

// Mock batch writes
export const mockBatch: any = {
  set: jest.fn(function () {
    return this;
  }),
  update: jest.fn(function () {
    return this;
  }),
  delete: jest.fn(function () {
    return this;
  }),
  commit: jest.fn().mockResolvedValue(undefined),
};

// Firebase mocks
export const mockFirebaseModules = {
  getAuth: jest.fn().mockReturnValue(mockAuth),
  initializeApp: jest.fn().mockReturnValue(mockFirebaseApp),
  getFirestore: jest.fn().mockReturnValue(mockFirestore),
  getDatabase: jest.fn(),
  getStorage: jest.fn(),
};

// Firestore functions
export const mockFirestoreFunctions = {
  doc: jest.fn().mockReturnValue(mockDocRef),
  collection: jest.fn().mockReturnValue(mockCollectionRef),
  query: jest.fn((collectionRef: any, ...constraints: any[]) => ({
    _key: { path: { segments: [] } },
    constraints,
    get: jest.fn().mockResolvedValue(createMockQuerySnapshot([])),
    onSnapshot: jest.fn((callback: Function) => {
      callback(createMockQuerySnapshot([]));
      return jest.fn();
    }),
  })),
  where: jest.fn((field: string, operator: string, value: any) => ({
    field,
    operator,
    value,
  })),
  orderBy: jest.fn((field: string, direction = "asc") => ({
    field,
    direction,
  })),
  limit: jest.fn((size: number) => ({ size })),
  onSnapshot: jest.fn((ref: any, callback: Function) => {
    callback(createMockQuerySnapshot([{ uid: "test-user-123" }]));
    return jest.fn();
  }),
  writeBatch: jest.fn().mockReturnValue(mockBatch),
  runTransaction: jest.fn((db: any, updateFunction: Function) => {
    const transaction = {
      get: jest
        .fn()
        .mockResolvedValue(createMockFirestoreDoc({ uid: "test-user-123" })),
      set: jest.fn().mockReturnValue(undefined),
      update: jest.fn().mockReturnValue(undefined),
      delete: jest.fn().mockReturnValue(undefined),
    };
    return updateFunction(transaction);
  }),
  getDoc: jest
    .fn()
    .mockResolvedValue(createMockFirestoreDoc({ uid: "test-user-123" })),
  getDocs: jest
    .fn()
    .mockResolvedValue(createMockQuerySnapshot([{ uid: "test-user-123" }])),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  addDoc: jest.fn().mockResolvedValue({
    id: "new-doc-123",
    path: "collection/new-doc-123",
  }),
  arrayUnion: jest.fn((values: any) => ({
    _type: "arrayUnion",
    elements: Array.isArray(values) ? values : [values],
  })),
  arrayRemove: jest.fn((values: any) => ({
    _type: "arrayRemove",
    elements: Array.isArray(values) ? values : [values],
  })),
  serverTimestamp: jest.fn(() => ({
    _type: "serverTimestamp",
  })),
  increment: jest.fn((value: number) => ({
    _type: "increment",
    value,
  })),
};

// Auth functions
export const mockAuthFunctions = {
  onAuthStateChanged: jest.fn((auth: any, callback: Function) => {
    callback(mockUser);
    return jest.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
  signOut: jest.fn().mockResolvedValue(undefined),
  createUserWithEmailAndPassword: jest
    .fn()
    .mockResolvedValue({ user: mockUser }),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  setPersistence: jest.fn().mockResolvedValue(undefined),
  browserLocalPersistence: { type: "LOCAL" },
};

// Cloud Functions mocks
export const mockCloudFunctions = {
  httpsCallable: jest.fn((functions: any, name: string) => {
    return jest.fn().mockResolvedValue({
      data: {
        success: true,
        message: `${name} called successfully`,
      },
    });
  }),
  connectFunctionsEmulator: jest.fn(),
};

// Storage mocks
export const mockStorage = {
  app: mockFirebaseApp,
};

export const mockStorageFunctions = {
  getStorage: jest.fn().mockReturnValue(mockStorage),
  ref: jest.fn().mockReturnValue({
    child: jest.fn().mockReturnValue({
      child: jest.fn(),
    }),
  }),
  uploadBytes: jest.fn().mockResolvedValue({
    metadata: {
      size: 1024,
      name: "test.pdf",
    },
  }),
  getDownloadURL: jest.fn().mockResolvedValue("https://example.com/file.pdf"),
};

// Create a complete Firebase mock
export const createMockFirebase = () => ({
  ...mockFirebaseModules,
  ...mockFirestoreFunctions,
  ...mockAuthFunctions,
});

// Setup common Firebase mocks
export const setupFirebaseMocks = () => {
  jest.mock("firebase/app", () => mockFirebaseModules);
  jest.mock("firebase/firestore", () => mockFirestoreFunctions);
  jest.mock("firebase/auth", () => mockAuthFunctions);
  jest.mock("firebase/functions", () => mockCloudFunctions);
  jest.mock("firebase/storage", () => mockStorageFunctions);
};

// Mock real-time listener setup
export const setupRealtimeListener = (
  onSnapshot: jest.Mock,
  data: any = {}
) => {
  onSnapshot.mockImplementation((callback: Function) => {
    const unsubscribe = jest.fn();
    callback(createMockFirestoreDoc(data));
    return unsubscribe;
  });
};

// Mock transaction setup
export const setupTransaction = (
  runTransaction: jest.Mock,
  documentData: any = {}
) => {
  runTransaction.mockImplementation((db: any, updateFunction: Function) => {
    const transaction = {
      get: jest.fn().mockResolvedValue(createMockFirestoreDoc(documentData)),
      set: jest.fn().mockReturnValue(undefined),
      update: jest.fn().mockReturnValue(undefined),
      delete: jest.fn().mockReturnValue(undefined),
    };
    return updateFunction(transaction);
  });
};
