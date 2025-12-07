"use client";

interface AccountInformationProps {
  email?: string | null;
  resumeId?: string | number | null;
  hasResume: boolean;
  isRecruiter: boolean;
  saving: boolean;
  onRecruiterToggle: (checked: boolean) => void;
  onCopy: () => void;
}

export function AccountInformation({
  email,
  resumeId,
  hasResume,
  isRecruiter,
  saving,
  onRecruiterToggle,
  onCopy,
}: AccountInformationProps) {
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#1A2F25]">Account Information</h2>
      </div>

      <div className="space-y-6">
        {/* Email */}
        <div className="pb-6 border-b border-[#2C4A3B]/10">
          <label className="block text-sm font-bold text-[#1A2F25] mb-2">
            Email Address
          </label>
          <div className="px-4 py-3 bg-white/40 border border-[#2C4A3B]/20 rounded-lg text-[#1A2F25]/80 font-medium">
            {email}
          </div>
          <p className="text-[#2C4A3B]/60 text-sm mt-2">
            Your login email cannot be changed
          </p>
        </div>

        {/* Resume ID */}
        {hasResume && resumeId && (
          <div className="pb-6 border-b border-[#2C4A3B]/10">
            <label className="block text-sm font-bold text-[#1A2F25] mb-2">
              Resume ID
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-white/40 border border-[#2C4A3B]/20 rounded-lg text-[#2C4A3B] font-mono font-medium">
                {resumeId}
              </div>
              <button
                onClick={onCopy}
                className="glass-button px-4 py-3 bg-[#2C4A3B] text-white font-medium rounded-lg transition-all duration-200 hover:bg-[#1A2F25]"
              >
                Copy
              </button>
            </div>
            <p className="text-[#2C4A3B]/60 text-sm mt-2">
              Share this ID with recruiters to access your profile
            </p>
          </div>
        )}

        {/* Account Type */}
        <div className="pb-6 border-b border-[#2C4A3B]/10">
          <label className="block text-sm font-bold text-[#1A2F25] mb-3">
            Account Type
          </label>
          <p className="text-[#2C4A3B]/70 text-sm mb-4">
            {isRecruiter
              ? "You have recruiter access and can search for candidates"
              : "You are currently set up as a job seeker"}
          </p>
          <div className="flex items-center">
            <button
              onClick={() => onRecruiterToggle(!isRecruiter)}
              disabled={saving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isRecruiter
                  ? "bg-emerald-600"
                  : "bg-slate-300 hover:bg-slate-400"
                } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${isRecruiter ? "translate-x-7" : "translate-x-1"
                  }`}
              />
            </button>
            <span className="ml-3 text-[#1A2F25] font-bold">
              {isRecruiter ? "Recruiter" : "Job Seeker"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
