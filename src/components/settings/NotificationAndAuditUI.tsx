"use client";

import { useState, useEffect } from "react";
import {
  useNotificationPreferences,
  usePersonalAuditLogs,
} from "@/hooks/useAuditLog";

interface NotificationPreferences {
  recruiterRequests: boolean;
  profileViews: boolean;
  weeklyDigest: boolean;
  adminAlerts: boolean;
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
      setPreferences(preferences); // Revert change
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
        {/* Recruiter Requests */}
        <div className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">Recruiter Requests</h3>
            <p className="text-sm text-gray-600">
              Get notified when a recruiter requests access to your profile
            </p>
          </div>
          <button
            onClick={() => handleToggle("recruiterRequests")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences?.recruiterRequests ? "bg-blue-600" : "bg-gray-300"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences?.recruiterRequests
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Profile Views */}
        <div className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">Profile Views</h3>
            <p className="text-sm text-gray-600">
              Receive weekly digest of profile views and analytics
            </p>
          </div>
          <button
            onClick={() => handleToggle("profileViews")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences?.profileViews ? "bg-blue-600" : "bg-gray-300"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences?.profileViews ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Weekly Digest */}
        <div className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">Weekly Digest</h3>
            <p className="text-sm text-gray-600">
              Get a weekly summary of all activity on your account
            </p>
          </div>
          <button
            onClick={() => handleToggle("weeklyDigest")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences?.weeklyDigest ? "bg-blue-600" : "bg-gray-300"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences?.weeklyDigest ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Admin Alerts */}
        <div className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">Security Alerts</h3>
            <p className="text-sm text-gray-600">
              Get notified about suspicious activities and security events
            </p>
          </div>
          <button
            onClick={() => handleToggle("adminAlerts")}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences?.adminAlerts ? "bg-blue-600" : "bg-gray-300"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences?.adminAlerts ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
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

export function AuditLogViewer() {
  const { getMyAuditLogs, exportMyData } = usePersonalAuditLogs();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const auditLogs = await getMyAuditLogs(50);
        setLogs(auditLogs);
      } catch (error) {
        console.error("Failed to load audit logs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [getMyAuditLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `switchcv-data-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Failed to export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Log</h2>
          <p className="text-sm text-gray-600 mt-1">
            View your account activity and audit trail for security and
            compliance
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {exporting ? "Exporting..." : "Download Data"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading activity log...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No activity recorded yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-semibold">Date & Time</th>
                <th className="text-left p-3 font-semibold">Action</th>
                <th className="text-left p-3 font-semibold">Resource</th>
                <th className="text-left p-3 font-semibold">Details</th>
                <th className="text-left p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr
                  key={log.id || index}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-3 text-gray-600">
                    {new Date(
                      log.timestamp?.toDate?.() || log.timestamp
                    ).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {log.resourceType}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600 max-w-xs truncate">
                    {log.details || "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        log.status === "success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-gray-500 border-t pt-4 space-y-2">
        <p>
          <strong>Privacy & Security:</strong> Your activity logs are encrypted
          and only you (and admins) can view them. Logs are automatically
          deleted after 90 days.
        </p>
        <p>
          <strong>GDPR:</strong> You can download all your data in JSON format
          using the button above. This includes your profile, resumes, and
          activity logs.
        </p>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"notifications" | "audit">(
    "notifications"
  );

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === "notifications"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Activity & Privacy
          </button>
        </div>
      </div>

      {activeTab === "notifications" && <NotificationSettings />}
      {activeTab === "audit" && <AuditLogViewer />}
    </div>
  );
}
