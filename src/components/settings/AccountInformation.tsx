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
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-300 mb-6">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center mr-4">
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
        <h2 className="text-2xl font-bold text-white">Account Information</h2>
      </div>

      <div className="space-y-6">
        {/* Email */}
        <div className="pb-6 border-b border-white/10">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Email Address
          </label>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium">
            {email}
          </div>
          <p className="text-slate-500 text-sm mt-2">
            Your login email cannot be changed
          </p>
        </div>

        {/* Resume ID */}
        {hasResume && resumeId && (
          <div className="pb-6 border-b border-white/10">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Resume ID
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-cyan-400 font-mono font-medium">
                {resumeId}
              </div>
              <button
                onClick={onCopy}
                className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Copy
              </button>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Share this ID with recruiters to access your profile
            </p>
          </div>
        )}

        {/* Account Type */}
        <div className="pb-6 border-b border-white/10">
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Account Type
          </label>
          <p className="text-slate-400 text-sm mb-4">
            {isRecruiter
              ? "You have recruiter access and can search for candidates"
              : "You are currently set up as a job seeker"}
          </p>
          <div className="flex items-center">
            <button
              onClick={() => onRecruiterToggle(!isRecruiter)}
              disabled={saving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isRecruiter
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                  : "bg-slate-700 hover:bg-slate-600"
              } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isRecruiter ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
            <span className="ml-3 text-white font-medium">
              {isRecruiter ? "Recruiter" : "Job Seeker"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
