// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { connectAuthEmulator, getAuth } from "firebase/auth";
// import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: any;
let auth: any;
let db: any;
let storage: any;
let functions: any;

try {
  // Initialize Firebase only if config is available
  const hasConfig = Object.values(firebaseConfig).some(
    (val) => val && val.trim() !== ""
  );

  if (hasConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
  } else {
    console.warn(
      "Firebase config not fully configured. Using mock initialization."
    );
    app = { __isMock: true };
    auth = { __isMock: true };
    db = { __isMock: true };
    storage = { __isMock: true };
    functions = { __isMock: true };
  }
} catch (error) {
  console.warn("Firebase initialization error:", error);
  app = { __isMock: true };
  auth = { __isMock: true };
  db = { __isMock: true };
  storage = { __isMock: true };
  functions = { __isMock: true };
}

export { auth, db, storage, functions };
export default app;
