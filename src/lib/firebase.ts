import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
  setLogLevel,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";
import { logger } from "@/lib/logger";

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

type FirebaseClientName = "auth" | "db" | "storage" | "functions";

const firebaseClientError = (name: FirebaseClientName): string =>
  firebaseStatus.error ||
  `Firebase ${name} client is not initialized. Check environment configuration.`;

const createUnavailableClient = <T extends object>(
  name: FirebaseClientName,
): T =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(firebaseClientError(name));
      },
      apply() {
        throw new Error(firebaseClientError(name));
      },
    },
  ) as T;

const resolveClient = <T extends object>(
  client: T | null,
  name: FirebaseClientName,
): T => client ?? createUnavailableClient<T>(name);

const canInitialize = firebaseStatus.isConfigured;
const isProduction = process.env.NODE_ENV === "production";
const enableFirestoreDebugLogs =
  !isProduction && process.env.NEXT_PUBLIC_FIREBASE_DEBUG_LOGS === "true";
const useFirebaseEmulators =
  !isProduction && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
const emulatorHost =
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const firestoreEmulatorPort = Number(
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080,
);
const authEmulatorPort = Number(
  process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || 9099,
);

try {
  if (canInitialize) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Only initialize Analytics in production to avoid API key restriction errors in dev
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      isSupported()
        .then((supported) => {
          if (supported && app) {
            analytics = getAnalytics(app);
          }
        })
        .catch((error) => {
          logger.warn(
            { err: error },
            "Skipping Firebase Analytics initialization",
          );
        });
    }

    if (enableFirestoreDebugLogs) {
      setLogLevel("debug");
      logger.info(
        {
          source: "firebase",
        },
        "Firebase Firestore debug logging enabled",
      );
    }

    if (useFirebaseEmulators) {
      if (db) {
        connectFirestoreEmulator(db, emulatorHost, firestoreEmulatorPort);
      }
      if (auth) {
        const emulatorOrigin = `http://${emulatorHost}:${authEmulatorPort}`;
        try {
          connectAuthEmulator(auth, emulatorOrigin, { disableWarnings: true });
        } catch (error) {
          logger.warn(
            { err: error, source: "firebase.auth" },
            "Auth emulator already configured",
          );
        }
      }
      logger.info(
        {
          source: "firebase",
          emulatorHost,
          firestoreEmulatorPort,
          authEmulatorPort,
        },
        "Connected Firebase clients to local emulators",
      );
    }

    firebaseStatus.isReady = true;
  } else {
    firebaseStatus.error = `Missing Firebase config keys: ${firebaseStatus.missingKeys.join(
      ", ",
    )}`;

    if (process.env.NODE_ENV === "test") {
      app = {} as FirebaseApp;
      auth = { __isMock: true } as unknown as Auth;
      db = { __isMock: true } as unknown as Firestore;
      storage = { __isMock: true } as unknown as FirebaseStorage;
      functions = { __isMock: true } as unknown as Functions;
      firebaseStatus.isReady = true;
    }
  }
} catch (error) {
  firebaseStatus.error =
    error instanceof Error ? error.message : "Unknown Firebase init error";
  if (process.env.NODE_ENV === "test") {
    app = {} as FirebaseApp;
    auth = { __isMock: true } as unknown as Auth;
    db = { __isMock: true } as unknown as Firestore;
    storage = { __isMock: true } as unknown as FirebaseStorage;
    functions = { __isMock: true } as unknown as Functions;
    firebaseStatus.isReady = true;
  }
}

const authClient = auth as Auth;
const dbClient = db as Firestore;
const storageClient = storage as FirebaseStorage;
const functionsClient = functions as Functions;
const safeAuthClient = resolveClient(authClient ?? null, "auth");
const safeDbClient = resolveClient(dbClient ?? null, "db");
const safeStorageClient = resolveClient(storageClient ?? null, "storage");
const safeFunctionsClient = resolveClient(functionsClient ?? null, "functions");

export {
  safeAuthClient as auth,
  safeDbClient as db,
  safeStorageClient as storage,
  safeFunctionsClient as functions,
  analytics,
};
export default app;
