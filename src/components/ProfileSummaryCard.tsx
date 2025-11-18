"use client";

import { ProfileSearchResult } from "@/types/profileSearch";

interface ProfileSummaryCardProps {
  profile: ProfileSearchResult;
}

/**
 * Card component for displaying a profile summary in search results
 */
export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">
          {profile.displayName || profile.username}
        </h3>
        {profile.location && (
          <p className="text-sm text-gray-400">{profile.location}</p>
        )}
      </div>

      {profile.bio && (
        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
          {profile.bio}
        </p>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {profile.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded"
            >
              {skill}
            </span>
          ))}
          {profile.skills.length > 3 && (
            <span className="text-xs text-gray-500">
              +{profile.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 rounded transition">
          View Profile
        </button>
        {!profile.hasApproval && (
          <button className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white py-1 rounded transition">
            Request Access
          </button>
        )}
      </div>
    </div>
  );
}
