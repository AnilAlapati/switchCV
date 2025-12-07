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
    <div className="glass-panel p-8 mb-6">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-[#2C4A3B] flex items-center justify-center mr-4 shadow-lg">
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
        <h2 className="text-2xl font-bold text-[#1A2F25]">Profile Details</h2>
      </div>

      <div className="space-y-6">
        {/* Display Name */}
        <div className="pb-6 border-b border-[#2C4A3B]/10">
          <label className="block text-sm font-bold text-[#1A2F25] mb-3">
            Display Name
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Enter your display name"
              disabled={saving}
              className="glass-input flex-1 rounded-lg"
            />
            <button
              onClick={onSaveDisplayName}
              disabled={saving}
              className="glass-button px-6 py-3 bg-[#2C4A3B] text-white hover:bg-[#1A2F25] font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="text-[#2C4A3B]/60 text-sm mt-2">
            This name will be visible to other users on your profile
          </p>
        </div>

        {/* Company Name - Recruiter Only */}
        {showCompanyInput && (
          <div className="pb-6 border-b border-[#2C4A3B]/10 animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-[#1A2F25] mb-3">
              Company Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={companyName}
                onChange={(e) => onCompanyNameChange(e.target.value)}
                placeholder="Enter your company name"
                disabled={saving}
                className="glass-input flex-1 rounded-lg"
              />
              <button
                onClick={onSaveCompanyName}
                disabled={saving}
                className="glass-button px-6 py-3 bg-[#2C4A3B] text-white hover:bg-[#1A2F25] font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="text-[#2C4A3B]/60 text-sm mt-2">
              Your company name will appear on your recruiter profile
            </p>
          </div>
        )}

        {/* Last Updated */}
        <div>
          <label className="block text-sm font-bold text-[#1A2F25] mb-2">
            Last Updated
          </label>
          <div className="px-4 py-3 bg-white/40 border border-[#2C4A3B]/20 rounded-lg text-[#1A2F25]/80 font-medium">
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
