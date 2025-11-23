// src/components/RequestAccessDialog.tsx
"use client";

import { useState } from "react";

interface RequestAccessDialogProps {
  profileName: string;
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestAccessDialog({
  profileName,
  profileId,
  isOpen,
  onClose,
  onSuccess,
}: RequestAccessDialogProps) {
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState<
    "1hour" | "1day" | "1week" | "forever"
  >("1week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileId.trim()) {
      setError("Invalid profile ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/profiles/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: profileId,
          message: message.trim() || undefined,
          duration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to send request"
        );
      }

      setMessage("");
      setDuration("1week");
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Request error:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              Request Full Access
            </h2>
            <p className="text-gray-400 text-sm mt-1">{profileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm">
              {error}
              {error.includes("Company name is required") && (
                <div className="mt-2">
                  <a
                    href="/profile/settings"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Update Profile Settings
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Duration Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              How long should they have access?
            </label>
            <select
              value={duration}
              onChange={(e) =>
                setDuration(
                  e.target.value as "1hour" | "1day" | "1week" | "forever"
                )
              }
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="1hour">1 Hour</option>
              <option value="1day">1 Day</option>
              <option value="1week">1 Week</option>
              <option value="forever">Forever</option>
            </select>
            <p className="text-gray-500 text-xs mt-1">
              They can accept and specify the duration, but won't exceed your
              request.
            </p>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              placeholder="Tell them why you'd like to view their full resume..."
              maxLength={500}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            <p className="text-gray-500 text-xs mt-1">
              {message.length}/500 characters
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-blue-300 text-xs">
            📧 They'll receive a notification about your request and can approve
            or deny it.
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
