"use client";

interface ProfileDetailsProps {
  displayName: string;
  companyName: string;
  updatedAt: string;
  showCompanyInput: boolean;
  saving: boolean;
  onDisplayNameChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onSaveDisplayName: () => void;
  onSaveCompanyName: () => void;
}

export function ProfileDetails({
  displayName,
  companyName,
  updatedAt,
  showCompanyInput,
  saving,
  onDisplayNameChange,
  onCompanyNameChange,
  onSaveDisplayName,
  onSaveCompanyName,
}: ProfileDetailsProps) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-300 mb-6">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center mr-4">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Profile Details</h2>
      </div>

      <div className="space-y-6">
        {/* Display Name */}
        <div className="pb-6 border-b border-white/10">
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Display Name
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Enter your display name"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
            />
            <button
              onClick={onSaveDisplayName}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            This name will be visible to other users on your profile
          </p>
        </div>

        {/* Company Name - Recruiter Only */}
        {showCompanyInput && (
          <div className="pb-6 border-b border-white/10 animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Company Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={companyName}
                onChange={(e) => onCompanyNameChange(e.target.value)}
                placeholder="Enter your company name"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
              />
              <button
                onClick={onSaveCompanyName}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Your company name will appear on your recruiter profile
            </p>
          </div>
        )}

        {/* Last Updated */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Last Updated
          </label>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-300 font-medium">
            {updatedAt
              ? new Date(updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never"}
          </div>
        </div>
      </div>
    </div>
  );
}
