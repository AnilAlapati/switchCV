"use client";

interface EmailVerificationNoticeProps {
  email?: string | null;
  approvalStatus?: string;
  onResend: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  resending?: boolean;
  refreshing?: boolean;
}

export function EmailVerificationNotice({
  email,
  approvalStatus,
  onResend,
  onRefresh,
  onSignOut,
  resending = false,
  refreshing = false,
}: EmailVerificationNoticeProps) {
  const isPendingApproval = approvalStatus === "pending";

  return (
    <div className="mb-8 relative group overflow-hidden rounded-2xl p-[1px]">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-200/40 via-orange-200/40 to-amber-200/40 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative bg-white/40 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100/50 flex items-center justify-center shrink-0 border border-amber-200/50">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-[#1A2F25] font-bold text-base mb-1">
              {isPendingApproval ? "Registration Received" : "Verify your email"}
            </h3>
            <div className="text-[#1A2F25]/70 text-sm leading-relaxed mb-4">
              {isPendingApproval ? (
                <>
                  Our team is currently reviewing your registration. This typically takes less than 24 hours.
                  <br />
                  <span className="font-semibold text-[#1A2F25]">Once approved, we'll send a verification link to {email || "your inbox"}.</span>
                </>
              ) : (
                <>
                  We sent a verification link to <span className="font-semibold text-[#1A2F25]">{email || "your inbox"}</span>.
                  <br />
                  Please verify your address to continue.
                </>
              )}
              <br />
              <span className="text-xs text-amber-700/80 italic mt-1 block">
                Remember to check your spam folder.
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#1A2F25] text-white text-sm font-medium shadow-lg shadow-[#1A2F25]/10 hover:shadow-xl hover:shadow-[#1A2F25]/20 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" aria-hidden="true" role="status" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking status...
                  </>
                ) : (
                  "Refresh status"
                )}
              </button>

              {!isPendingApproval && (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resending}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-[#1A2F25]/10 text-[#1A2F25]/70 text-sm font-medium hover:bg-gray-50 hover:text-[#1A2F25] hover:border-[#1A2F25]/20 transition-all duration-200 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend link"}
                </button>
              )}

              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-transparent text-[#1A2F25]/50 text-sm font-medium hover:text-[#1A2F25]/80 hover:bg-[#1A2F25]/5 transition-all duration-200"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
