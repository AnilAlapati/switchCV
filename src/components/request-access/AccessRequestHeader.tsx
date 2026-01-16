interface AccessRequestHeaderProps {
  profileName: string;
  onClose: () => void;
}

export function AccessRequestHeader({
  profileName,
  onClose,
}: AccessRequestHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-emerald-50 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Access Request
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#1A2F25]">
            Request View Access
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-[#1A2F25]/60">
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/50 text-emerald-600 transition-all hover:bg-emerald-100 hover:text-emerald-700"
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
