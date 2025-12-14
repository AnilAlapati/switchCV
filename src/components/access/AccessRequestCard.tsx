"use client";

import { formatDurationLabel } from "@/lib/accessDuration";
import type {
  DashboardAccessRequest,
  DurationFormState,
} from "@/app/dashboard/access-requests/types";
import { PendingAccessControls } from "@/components/access/PendingAccessControls";

interface AccessRequestCardProps {
  request: DashboardAccessRequest;
  activeTab: "pending" | "history";
  ownerTimezone: string;
  loading: boolean;
  durationState: DurationFormState;
  durationError?: string | null;
  maxHours: number;
  onDeny: () => void;
  onApprove: () => void;
  onPresetChange: (preset: DurationFormState["preset"]) => void;
  onCustomDaysChange: (value: number) => void;
}

export function AccessRequestCard({
  request,
  activeTab,
  ownerTimezone,
  loading,
  durationState,
  durationError,
  maxHours,
  onDeny,
  onApprove,
  onPresetChange,
  onCustomDaysChange,
}: AccessRequestCardProps) {
  const requestedLabel = formatDurationLabel(request.requestedDuration);
  const grantedLabel = formatDurationLabel(request.grantedDuration);
  const requestMessage = request.message?.trim() || "No message provided.";

  const renderDurationSummary = () => {
    if (request.status === "pending") {
      return (
        <p className="text-xs text-[#1A2F25]/60">
          Requested: {requestedLabel}
          {request.requestedDuration?.timezone &&
            ` (${request.requestedDuration.timezone})`}
        </p>
      );
    }

    if (request.status === "approved") {
      return (
        <p className="text-xs text-emerald-600">
          Shared for {grantedLabel}
          {request.expiresAt &&
            ` · Expires ${new Date(request.expiresAt).toLocaleString()}`}
        </p>
      );
    }

    return null;
  };

  return (
    <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 className="text-lg font-semibold text-[#1A2F25]">
          {request.fromUserName} requested access to{" "}
          <span className="text-[#2C4A3B]">{request.resumeTitle}</span>
        </h3>
        <p className="text-[#1A2F25]/70 mt-1">"{requestMessage}"</p>
        <p className="text-xs text-[#1A2F25]/50 mt-2">
          {activeTab === "pending" ? "Requested on" : "Updated on"}{" "}
          {new Date(request.timestamp).toLocaleDateString()}
        </p>
        {activeTab === "history" && (
          <span
            className={`mt-2 inline-block px-2 py-1 text-xs font-bold rounded uppercase ${request.status === "approved"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}
          >
            {request.status}
          </span>
        )}
        {renderDurationSummary()}
      </div>
      {activeTab === "pending" && (
        <PendingAccessControls
          ownerTimezone={ownerTimezone}
          recruiterTimezone={request.requestedDuration?.timezone}
          currentPreset={durationState.preset}
          customDays={durationState.customDays}
          error={durationError}
          loading={loading}
          requestedLabel={requestedLabel}
          maxHours={maxHours}
          onPresetChange={onPresetChange}
          onCustomDaysChange={onCustomDaysChange}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      )}
    </div>
  );
}
