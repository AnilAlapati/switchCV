"use client";

interface DownloadsCardProps {
  hasResume: boolean;
}

export function DownloadsCard({ hasResume }: DownloadsCardProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Downloads
            </dt>
            <dd className="text-2xl font-bold text-white">
              {hasResume ? "12" : "0"}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-slate-400 text-sm">
          {hasResume
            ? "Resume downloads this month"
            : "Downloads will appear here"}
        </p>
      </div>
    </div>
  );
}
