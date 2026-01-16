"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

/**
 * Temporary diagnostic component to debug Google Sign-In
 * Add this to your auth page temporarily: <GoogleSignInDebug />
 */
export function GoogleSignInDebug() {
  const initialLogs = [
    `Firebase Config Check:`,
    `- Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "MISSING"}`,
    `- Auth Domain: ${
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "MISSING"
    }`,
    `- Auth initialized: ${auth ? "YES" : "NO"}`,
  ];

  const [logs, setLogs] = useState<string[]>(initialLogs);
  const [isOpen, setIsOpen] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const testGoogleSignIn = async () => {
    addLog("Starting Google Sign-In test...");

    try {
      addLog("Creating GoogleAuthProvider...");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      addLog("Provider created successfully");

      addLog("Calling signInWithPopup...");
      const result = await signInWithPopup(auth, provider);

      addLog(`✅ SUCCESS! User: ${result.user.email}`);
      addLog(`UID: ${result.user.uid}`);
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      addLog(`❌ ERROR: ${authError.code || "unknown"}`);
      addLog(`Message: ${authError.message || "No message"}`);

      // Specific error diagnosis
      if (authError.code === "auth/popup-blocked") {
        addLog("💡 FIX: Allow popups for this site in browser settings");
      } else if (authError.code === "auth/popup-closed-by-user") {
        addLog("💡 FIX: Complete the sign-in process without closing popup");
      } else if (authError.code === "auth/unauthorized-domain") {
        addLog(
          "💡 FIX: Add domain to Firebase Console → Authentication → Settings → Authorized domains"
        );
      } else if (authError.code === "auth/operation-not-allowed") {
        addLog("💡 FIX: Enable Google provider in Firebase Console");
      } else if (authError.code === "auth/configuration-not-found") {
        addLog("💡 FIX: Check Firebase project configuration");
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-600 z-50"
        title="Open Google Sign-In Debugger"
      >
        🔍 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-50 w-96 max-h-96 overflow-hidden flex flex-col">
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
        <span className="font-bold">Google Sign-In Debug</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-2">
        <button
          onClick={testGoogleSignIn}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          🧪 Test Google Sign-In
        </button>

        <button
          onClick={() => setLogs([])}
          className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-900 text-green-400 p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
