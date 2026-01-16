"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function SecuritySection(): ReactElement | null {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChangePassword = async (): Promise<void> => {
    if (!user?.email) return;
    setLoading(true);
    try {
      // Use custom password reset endpoint to ensure emails use Gmail SMTP
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setMessage({
        type: "success",
        text: "Password reset email sent! Check your inbox at " + user.email,
      });
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const providers = user?.providerData.map((p) => p.providerId) || [];
  const isEmailLinked = providers.includes("password");

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-6">
          <div className="w-12 h-12 bg-black flex items-center justify-center text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-black">Security</h2>
            <p className="text-gray-500 text-sm font-sans">
              Manage your password and sign-in methods
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {isEmailLinked && (
            <div className="flex items-center justify-between p-5 bg-gray-50 border-2 border-gray-200">
              <div>
                <h3 className="font-bold text-black">Password</h3>
                <p className="text-xs text-gray-500 font-sans">
                  Change your login password
                </p>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-4 py-2 bg-white text-black text-sm font-bold border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
              >
                Reset Password
              </button>
            </div>
          )}

          {message && (
            <div
              className={`p-4 text-sm border-2 ${message.type === "success"
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-red-50 text-red-800 border-red-200"
                }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
