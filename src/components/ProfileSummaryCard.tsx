// src/components/ProfileSummaryCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccessControl } from "@/hooks/useAccessControl";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import { ProfileSearchResult } from "@/types/profileSearch";

interface ProfileSummaryCardProps {
  profile: ProfileSearchResult;
  resumeId?: string;
}

export function ProfileSummaryCard({
  profile,
  resumeId = "default",
}: ProfileSummaryCardProps) {
  const router = useRouter();
  const { activeGrants } = useAccessControl({
    resumeId,
  });

  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasAccess = activeGrants.length > 0 || profile.hasApproval;

  const handleRequestAccessClick = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setRequestError(null);
  };

  const handleRequestSuccess = () => {
    setRequestError("Access request sent!");
    setTimeout(() => setRequestError(null), 3000);
  };

  const handleViewProfile = () => {
    router.push(`/profiles/${profile.userId}`);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white">
            {profile.displayName}
          </h3>
          {profile.role && (
            <p className="text-blue-400 text-sm mt-1">{profile.role}</p>
          )}
        </div>
        {profile.hasApproval && (
          <span className="px-2 py-1 bg-green-900/30 border border-green-500/50 text-green-400 text-xs rounded">
            Approved
          </span>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{profile.bio}</p>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {profile.skills.slice(0, 5).map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 5 && (
              <span className="px-3 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-full">
                +{profile.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Location */}
      {profile.location && (
        <p className="text-gray-500 text-xs mb-4">📍 {profile.location}</p>
      )}

      {/* Error Message */}
      {requestError && !requestError.includes("sent") && (
        <div className="mb-4 p-2 bg-red-900/30 border border-red-500/50 text-red-300 text-xs rounded">
          {requestError}
        </div>
      )}
      {requestError && requestError.includes("sent") && (
        <div className="mb-4 p-2 bg-green-900/30 border border-green-500/50 text-green-300 text-xs rounded">
          {requestError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button
          onClick={handleViewProfile}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          View Summary
        </button>
        {!hasAccess && (
          <button
            onClick={handleRequestAccessClick}
            disabled={requesting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 rounded-lg transition-colors"
          >
            {requesting ? "Sending..." : "Request Access"}
          </button>
        )}
        {hasAccess && (
          <button
            onClick={handleViewProfile}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            View Full Resume
          </button>
        )}
      </div>

      {/* Request Access Dialog */}
      <RequestAccessDialog
        profileName={profile.displayName}
        profileId={profile.userId}
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
