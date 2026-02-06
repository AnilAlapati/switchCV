"use client";

import { logger } from "@/lib/logger";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { usePersonalAuditLogs } from "@/hooks/useAuditLog";

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
        logger.error({ err: error }, "Failed to load audit logs:");
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
      logger.error({ err: error }, "Failed to export data:");
      toast.error("Failed to export your data. Please try again.");
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
                      log.timestamp?.toDate?.() || log.timestamp,
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
