"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface UserSettings {
  isRecruiter: boolean;
  displayName?: string;
  companyName?: string;
  updatedAt?: string;
}

export function UserProfileSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    isRecruiter: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showCompanyInput, setShowCompanyInput] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/user/profile?userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          setShowCompanyInput(data.isRecruiter);
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch profile:");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleRecruiterToggle = async (checked: boolean) => {
    if (!user?.uid) {
      setMessage({
        type: "error",
        text: "User ID not available. Please refresh and try again.",
      });
      return;
    }

    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          isRecruiter: checked,
          companyName: checked ? settings.companyName : "",
        }),
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, isRecruiter: checked }));
        setShowCompanyInput(checked);
        setMessage({ type: "success", text: "Account type updated!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `API error: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      logger.error({ err: error }, "Error updating profile:");
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update account type. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanyName = async () => {
    if (!settings.companyName?.trim()) {
      setMessage({ type: "error", text: "Please enter a company name." });
      return;
    }

    if (!user?.uid) {
      setMessage({
        type: "error",
        text: "User ID not available. Please refresh and try again.",
      });
      return;
    }

    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          companyName: settings.companyName,
        }),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Company name saved!",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `API error: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      logger.error({ err: error }, "Error saving company name:");
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save company name. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center mr-3">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Profile Settings
        </h2>
      </div>

      {/* User Info */}
      <div className="mb-6 pb-6 border-b border-white/10">
        <p className="text-slate-300 text-sm mb-2">
          <span className="text-slate-400">Email:</span> {user?.email}
        </p>
        <p className="text-slate-300 text-sm">
          <span className="text-slate-400">Account Type:</span>{" "}
          <span
            className={
              settings.isRecruiter
                ? "text-amber-400 font-semibold"
                : "text-cyan-400 font-semibold"
            }
          >
            {settings.isRecruiter ? "Recruiter" : "Job Seeker"}
          </span>
        </p>
      </div>

      {/* Recruiter Toggle */}
      <div className="mb-6 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Recruiter Account
            </h3>
            <p className="text-slate-400 text-sm">
              {settings.isRecruiter
                ? "You can now search for and contact candidates"
                : "Enable this to access recruiter features and search for candidates"}
            </p>
          </div>
          <div className="flex items-center ml-4">
            <button
              onClick={() => handleRecruiterToggle(!settings.isRecruiter)}
              disabled={saving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                settings.isRecruiter
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                  : "bg-slate-700 hover:bg-slate-600"
              } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  settings.isRecruiter ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Company Name Input (Recruiter Only) */}
      {showCompanyInput && (
        <div className="mb-6 pb-6 border-b border-white/10 animate-in fade-in slide-in-from-top-2">
          <label
            htmlFor="company-name-input"
            className="block text-sm font-semibold text-white mb-3"
          >
            Company Name
          </label>
          <div className="flex gap-3">
            <input
              id="company-name-input"
              type="text"
              value={settings.companyName || ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }))
              }
              placeholder="Enter your company name"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
            />
            <button
              onClick={handleSaveCompanyName}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
            message.type === "success"
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-red-500/20 text-red-300 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
