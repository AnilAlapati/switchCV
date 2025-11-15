"use client";

interface LastUpdatedCardProps {
  hasResume: boolean;
}

export function LastUpdatedCard({ hasResume }: LastUpdatedCardProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Last Updated
            </dt>
            <dd className="text-lg font-bold text-white">
              {hasResume ? "2 days ago" : "Never"}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-slate-400 text-sm">
          {hasResume
            ? "Keep your resume fresh!"
            : "Create your resume to track updates"}
        </p>
      </div>
    </div>
  );
}
