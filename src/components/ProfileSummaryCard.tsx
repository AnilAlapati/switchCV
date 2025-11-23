"use client";

import { ProfileSearchResult } from "@/types/profileSearch";

interface ProfileSummaryCardProps {
  profile: ProfileSearchResult;
}

/**
 * Card component for displaying a profile summary in search results
 */
export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  const displayName = profile.displayName || profile.username;
  const hasAccess = profile.hasApproval;

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-white shadow-lg shadow-slate-950/40">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-200 text-sm font-semibold uppercase">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{displayName}</h3>
          {profile.location && (
            <p className="text-sm text-slate-400">{profile.location}</p>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 text-sm text-slate-300 line-clamp-2">
          {profile.bio}
        </p>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={`${profile.userId}-skill-${idx}`}
              className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100"
            >
              {skill}
            </span>
          ))}
          {profile.skills.length > 3 && (
            <span className="text-xs text-slate-500">
              +{profile.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {hasAccess ? (
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Access granted. View full contact information anytime.
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  Request contact access
                </p>
                <p className="text-sm text-cyan-50">
                  Share why you are reaching out to speed up approvals.
                </p>
              </div>
              <button className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100">
                Request Access
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/50">
            View Profile
          </button>
        </div>
      </div>
    </article>
  );
}
