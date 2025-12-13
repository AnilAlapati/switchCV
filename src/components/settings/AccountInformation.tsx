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
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/40 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1A2F25]/5 flex items-center justify-center text-[#1A2F25]">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1A2F25]">Account Settings</h2>
        </div>

        <div className="space-y-8">
          {/* Email */}
          <div className="group">
            <label className="block text-xs font-bold text-[#1A2F25]/60 uppercase tracking-wider mb-2 ml-1">
              Email Address
            </label>
            <div className="px-5 py-4 bg-[#F5F7F6] rounded-xl text-[#1A2F25] font-medium border border-transparent group-hover:border-[#1A2F25]/5 transition-colors">
              {email}
            </div>
            <p className="text-[#1A2F25]/40 text-xs mt-2 ml-1">
              Used for login and notifications
            </p>
          </div>

          {/* Resume ID */}
          {hasResume && resumeId && (
            <div className="group">
              <label className="block text-xs font-bold text-[#1A2F25]/60 uppercase tracking-wider mb-2 ml-1">
                Resume ID
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-5 py-4 bg-[#F5F7F6] rounded-xl text-[#1A2F25] font-mono font-medium border border-transparent group-hover:border-[#1A2F25]/5 transition-colors">
                  {resumeId}
                </div>
                <button
                  onClick={onCopy}
                  className="p-4 bg-white text-[#2C4A3B] rounded-xl shadow-sm border border-[#2C4A3B]/10 hover:bg-[#2C4A3B] hover:text-white transition-all duration-200"
                  title="Copy Resume ID"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-[#1A2F25]/40 text-xs mt-2 ml-1">
                Share this ID with recruiters
              </p>
            </div>
          )}

          {/* Account Type */}
          <div className="pt-6 border-t border-[#1A2F25]/5">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-bold text-[#1A2F25]/60 uppercase tracking-wider ml-1">
                Account Type
              </label>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isRecruiter
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isRecruiter ? "Recruiter" : "Job Seeker"}
              </span>
            </div>

            <div className="bg-[#F5F7F6] rounded-xl p-5">
              <p className="text-[#1A2F25]/70 text-sm mb-4 leading-relaxed">
                {isRecruiter
                  ? "You have recruiter access. You can search for candidates and view their profiles."
                  : "You are currently a job seeker. Switch to recruiter mode to search for candidates."}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1A2F25]">
                  Recruiter Mode
                </span>
                <button
                  onClick={() => onRecruiterToggle(!isRecruiter)}
                  disabled={saving}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:ring-offset-2 ${
                    isRecruiter
                      ? "bg-[#2C4A3B]"
                      : "bg-slate-300 hover:bg-slate-400"
                  } ${
                    saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                      isRecruiter ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
