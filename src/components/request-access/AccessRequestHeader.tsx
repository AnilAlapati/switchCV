interface AccessRequestHeaderProps {
  profileName: string;
  onClose: () => void;
}

export function AccessRequestHeader({
  profileName,
  onClose,
}: AccessRequestHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-slate-900/95 to-slate-950/95 p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
              Access Request
            </span>
          </div>
          <h2 className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-black text-transparent">
            Request View Access
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
            <svg
              className="h-4 w-4"
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
            {profileName}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-800/60 text-slate-400 transition-all hover:border-white/30 hover:bg-slate-800 hover:text-white"
          aria-label="Close"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
