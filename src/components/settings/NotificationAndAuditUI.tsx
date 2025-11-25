"use client";

import { useState } from "react";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";

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

export { NotificationSettings };
export { AuditLogViewer };
