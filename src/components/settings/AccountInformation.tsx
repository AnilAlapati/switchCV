"use client";

import type { ReactElement } from "react";

interface AccountInformationProps {
  email?: string | null;
  resumeId?: string | number | null;
  hasResume: boolean;
  isRecruiter: boolean;
  savingRecruiter: boolean;
  onRecruiterToggle: (checked: boolean) => void;
  onCopy: () => void;
}

export function AccountInformation({
  email,
  resumeId,
  hasResume,
  isRecruiter,
  savingRecruiter,
  onRecruiterToggle,
  onCopy,
}: AccountInformationProps): ReactElement {
  return (
    <div className="bg-white border-2 border-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-4">
          <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
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
          <h2 className="text-xl font-serif font-bold text-black">Account Settings</h2>
        </div>

        <div className="space-y-8">
          {/* Email */}
          <div className="group">
            <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
              Email Address
            </label>
            <div className="px-5 py-4 bg-gray-50 border-2 border-gray-200 text-black font-medium transition-colors group-hover:border-gray-300">
              {email}
            </div>
            <p className="text-gray-400 text-xs mt-2 ml-1 font-sans">
              Used for login and notifications
            </p>
          </div>

          {/* Resume ID */}
          {hasResume && resumeId && (
            <div className="group">
              <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                Resume ID
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-5 py-4 bg-gray-50 border-2 border-gray-200 text-black font-mono font-medium transition-colors group-hover:border-gray-300">
                  {resumeId}
                </div>
                <button
                  onClick={onCopy}
                  className="p-4 bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-200"
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
              <p className="text-gray-400 text-xs mt-2 ml-1 font-sans">
                Share this ID with recruiters
              </p>
            </div>
          )}

          {/* Account Type */}
          <div className="pt-6 border-t-2 border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest ml-1">
                Account Type
              </label>
              <span
                className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${isRecruiter
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
              >
                {isRecruiter ? "Recruiter" : "Job Seeker"}
              </span>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-5">
              <p className="text-gray-600 text-sm mb-4 leading-relaxed font-sans">
                {isRecruiter
                  ? "You have recruiter access. You can search for candidates and view their profiles."
                  : "You are currently a job seeker. Switch to recruiter mode to search for candidates."}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-black">
                  Recruiter Mode
                </span>
                <button
                  onClick={() => onRecruiterToggle(!isRecruiter)}
                  disabled={savingRecruiter}
                  className={`relative inline-flex h-7 w-12 items-center transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${isRecruiter
                    ? "bg-black"
                    : "bg-gray-300 hover:bg-gray-400"
                    } ${savingRecruiter ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform bg-white transition-transform shadow-sm ${isRecruiter ? "translate-x-6" : "translate-x-1"
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
