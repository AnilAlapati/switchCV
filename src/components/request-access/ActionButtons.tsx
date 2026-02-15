interface ActionButtonsProps {
  loading: boolean;
  onClose: () => void;
}

export function ActionButtons({ loading, onClose }: ActionButtonsProps) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50/50 px-5 py-3 font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-[#2C4A3B] to-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                aria-hidden="true"
                role="status"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Request View Access
            </>
          )}
        </span>
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
      </button>
    </div>
  );
}
