"use client";

import { useState, useEffect } from "react";
import { useNotificationPreferences } from "@/hooks/useAuditLog";

interface NotificationPreferences {
  recruiterRequests: boolean;
  profileViews: boolean;
  weeklyDigest: boolean;
  adminAlerts: boolean;
}

const NOTIFICATION_OPTIONS = [
  {
    key: "recruiterRequests" as const,
    label: "Recruiter Requests",
    description:
      "Get notified when a recruiter requests access to your profile",
  },
  {
    key: "profileViews" as const,
    label: "Profile Views",
    description: "Receive weekly digest of profile views and analytics",
  },
  {
    key: "weeklyDigest" as const,
    label: "Weekly Digest",
    description: "Get a weekly summary of all activity on your account",
  },
  {
    key: "adminAlerts" as const,
    label: "Security Alerts",
    description: "Get notified about suspicious activities and security events",
  },
];

function NotificationToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-blue-600" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function NotificationSettings() {
  const { getPreferences, updatePreferences } = useNotificationPreferences();
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getPreferences();
        setPreferences(
          prefs || {
            recruiterRequests: true,
            profileViews: true,
            weeklyDigest: true,
            adminAlerts: true,
          }
        );
      } catch (error) {
        console.error("Failed to load preferences:", error);
        setMessage("Failed to load notification preferences");
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [getPreferences]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;

    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };

    setPreferences(updated);
    setSaving(true);
    setMessage("");

    try {
      await updatePreferences({ [key]: updated[key] });
      setMessage("✓ Settings saved successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Failed to update preferences:", error);
      setMessage("✗ Failed to save settings");
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500">Loading notification settings...</div>
    );
  }

  return (
    <div className="space-y-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold">Notification Preferences</h2>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.includes("✓")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-4">
        {NOTIFICATION_OPTIONS.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-4 border rounded hover:bg-gray-50"
          >
            <div>
              <h3 className="font-semibold text-gray-900">{option.label}</h3>
              <p className="text-sm text-gray-600">{option.description}</p>
            </div>
            <NotificationToggle
              enabled={preferences?.[option.key] || false}
              onChange={() => handleToggle(option.key)}
              disabled={saving}
            />
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 border-t pt-4">
        <p>
          💡 You can change these settings anytime. We respect your privacy and
          will only send notifications for the items you've enabled.
        </p>
      </div>
    </div>
  );
}
