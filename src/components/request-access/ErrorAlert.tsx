interface ErrorAlertProps {
  error: string | null;
}

export function ErrorAlert({ error }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 shadow-lg shadow-rose-500/20">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-200">
          !
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-rose-100">{error}</p>
          {error.includes("Company name is required") && (
            <a
              href="/profile/settings"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Update Profile Settings
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
