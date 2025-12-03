"use client";

import { getDevModeStatus } from "@/lib/config.client";

/**
 * Development Mode Banner
 *
 * Displays a small floating badge in the corner showing active dev overrides.
 * Only renders when dev mode is enabled (never in production).
 *
 * This helps developers:
 * 1. Know when they're running with overrides active
 * 2. See which tier/role they're simulating
 * 3. Avoid confusion about why features are working differently
 */
export function DevModeBanner() {
  const { enabled, tierOverride, roleOverride } = getDevModeStatus();

  // Don't render anything if dev mode is not enabled
  if (!enabled) {
    return null;
  }

  // Don't render if no overrides are active
  if (!tierOverride && !roleOverride) {
    return null;
  }

  const tierColors: Record<string, string> = {
    basic: "bg-gray-600",
    premium: "bg-blue-600",
    enterprise: "bg-purple-600",
  };

  const roleColors: Record<string, string> = {
    jobseeker: "bg-green-600",
    recruiter: "bg-orange-600",
    admin: "bg-red-600",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1 items-end">
      <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-t shadow-lg">
        🔧 DEV MODE
      </div>
      <div className="bg-gray-900 border border-yellow-500 rounded-b shadow-lg p-2 text-xs space-y-1">
        {tierOverride && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Tier:</span>
            <span
              className={`${tierColors[tierOverride]} text-white px-2 py-0.5 rounded`}
            >
              {tierOverride.toUpperCase()}
            </span>
          </div>
        )}
        {roleOverride && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Role:</span>
            <span
              className={`${roleColors[roleOverride]} text-white px-2 py-0.5 rounded`}
            >
              {roleOverride.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
