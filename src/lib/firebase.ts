import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

type FirebaseStatus = {
  isConfigured: boolean;
  isReady: boolean;
  missingKeys: string[];
  error?: string;
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value.trim() === "")
  .map(([key]) => key);

export const firebaseStatus: FirebaseStatus = {
  isConfigured: missingKeys.length === 0,
  isReady: false,
  missingKeys,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;
let analytics: Analytics | null = null;

const canInitialize = firebaseStatus.isConfigured;

try {
  if (canInitialize) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    if (typeof window !== "undefined") {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      });
    }

    firebaseStatus.isReady = true;
  } else {
    firebaseStatus.error = `Missing Firebase config keys: ${firebaseStatus.missingKeys.join(
      ", "
    )}`;

    if (process.env.NODE_ENV === "test") {
      app = {} as FirebaseApp;
      auth = { __isMock: true } as Auth;
      db = { __isMock: true } as Firestore;
      storage = { __isMock: true } as FirebaseStorage;
      functions = { __isMock: true } as Functions;
      firebaseStatus.isReady = true;
    }
  }
} catch (error) {
  firebaseStatus.error =
    error instanceof Error ? error.message : "Unknown Firebase init error";
  if (process.env.NODE_ENV === "test") {
    app = {} as FirebaseApp;
    auth = { __isMock: true } as Auth;
    db = { __isMock: true } as Firestore;
    storage = { __isMock: true } as FirebaseStorage;
    functions = { __isMock: true } as Functions;
    firebaseStatus.isReady = true;
  }
}

const authClient = auth as Auth;
const dbClient = db as Firestore;
const storageClient = storage as FirebaseStorage;
const functionsClient = functions as Functions;

export {
  authClient as auth,
  dbClient as db,
  storageClient as storage,
  functionsClient as functions,
  analytics,
};
export default app;
