"use client";

import type { ReactElement } from "react";

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
}: ProfileDetailsProps): ReactElement {
  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300">
      <div className="p-8 sm:p-10">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-6">
          <div className="w-12 h-12 bg-black flex items-center justify-center text-white">
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
            <h2 className="text-2xl font-serif font-bold text-black">
              Public Profile
            </h2>
            <p className="text-gray-500 text-sm font-sans">
              How others see you on the platform
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Display Name */}
          <div className="group">
            <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
              Display Name
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="Enter your display name"
                disabled={savingDisplayName}
                className="w-full bg-gray-50 border-2 border-gray-200 px-5 py-4 text-black font-medium placeholder-gray-400 focus:border-black focus:bg-white transition-all duration-200"
              />
              <button
                onClick={onSaveDisplayName}
                disabled={savingDisplayName}
                className="absolute right-2 px-4 py-2 bg-black text-white text-sm font-bold border-2 border-black hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDisplayName ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-2 ml-1 font-sans">
              Visible to recruiters and other candidates
            </p>
          </div>

          {/* Company Name - Recruiter Only */}
          {showCompanyInput && (
            <div className="group animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                Company Name
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => onCompanyNameChange(e.target.value)}
                  placeholder="Enter your company name"
                  disabled={savingCompanyName}
                  className="w-full bg-gray-50 border-2 border-gray-200 px-5 py-4 text-black font-medium placeholder-gray-400 focus:border-black focus:bg-white transition-all duration-200"
                />
                <button
                  onClick={onSaveCompanyName}
                  disabled={savingCompanyName}
                  className="absolute right-2 px-4 py-2 bg-black text-white text-sm font-bold border-2 border-black hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCompanyName ? "Saving..." : "Save"}
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2 ml-1 font-sans">
                Displayed on your recruiter profile and job postings
              </p>
            </div>
          )}
        </div>
      </div>

      {updatedAt && (
        <div className="bg-gray-50 px-8 py-4 border-t-2 border-gray-100 flex justify-between items-center">
          <span className="text-gray-400 text-xs font-sans">
            Last updated
          </span>
          <span className="text-gray-600 text-xs font-mono">
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
