"use client";

interface ProfileDetailsProps {
  displayName: string;
  companyName: string;
  updatedAt: string;
  showCompanyInput: boolean;
  savingDisplayName: boolean;
  savingCompanyName: boolean;
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
  savingDisplayName,
  savingCompanyName,
  onDisplayNameChange,
  onCompanyNameChange,
  onSaveDisplayName,
  onSaveCompanyName,
}: ProfileDetailsProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-8 sm:p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2C4A3B] to-[#1A2F25] flex items-center justify-center shadow-lg shadow-[#2C4A3B]/20 text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1A2F25]">
              Public Profile
            </h2>
            <p className="text-[#1A2F25]/50 text-sm font-medium">
              How others see you on the platform
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Display Name */}
          <div className="group">
            <label className="block text-xs font-bold text-[#1A2F25]/60 uppercase tracking-wider mb-2 ml-1">
              Display Name
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="Enter your display name"
                disabled={savingDisplayName}
                className="w-full bg-[#F5F7F6] border-none rounded-xl px-5 py-4 text-[#1A2F25] font-medium placeholder-[#1A2F25]/30 focus:ring-2 focus:ring-[#2C4A3B]/20 focus:bg-white transition-all duration-200"
              />
              <button
                onClick={onSaveDisplayName}
                disabled={savingDisplayName}
                className="absolute right-2 px-4 py-2 bg-white text-[#2C4A3B] text-sm font-bold rounded-lg shadow-sm border border-[#2C4A3B]/10 hover:bg-[#2C4A3B] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDisplayName ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="text-[#1A2F25]/40 text-xs mt-2 ml-1">
              Visible to recruiters and other candidates
            </p>
          </div>

          {/* Company Name - Recruiter Only */}
          {showCompanyInput && (
            <div className="group animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block text-xs font-bold text-[#1A2F25]/60 uppercase tracking-wider mb-2 ml-1">
                Company Name
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => onCompanyNameChange(e.target.value)}
                  placeholder="Enter your company name"
                  disabled={savingCompanyName}
                  className="w-full bg-[#F5F7F6] border-none rounded-xl px-5 py-4 text-[#1A2F25] font-medium placeholder-[#1A2F25]/30 focus:ring-2 focus:ring-[#2C4A3B]/20 focus:bg-white transition-all duration-200"
                />
                <button
                  onClick={onSaveCompanyName}
                  disabled={savingCompanyName}
                  className="absolute right-2 px-4 py-2 bg-white text-[#2C4A3B] text-sm font-bold rounded-lg shadow-sm border border-[#2C4A3B]/10 hover:bg-[#2C4A3B] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCompanyName ? "Saving..." : "Save"}
                </button>
              </div>
              <p className="text-[#1A2F25]/40 text-xs mt-2 ml-1">
                Displayed on your recruiter profile and job postings
              </p>
            </div>
          )}
        </div>
      </div>

      {updatedAt && (
        <div className="bg-[#F5F7F6]/50 px-8 py-4 border-t border-[#1A2F25]/5 flex justify-between items-center">
          <span className="text-[#1A2F25]/40 text-xs font-medium">
            Last updated
          </span>
          <span className="text-[#1A2F25]/60 text-xs font-mono">
            {new Date(updatedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
