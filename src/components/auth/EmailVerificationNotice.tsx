"use client";

interface EmailVerificationNoticeProps {
  email?: string | null;
  onResend: () => Promise<void>;
  onRefresh: () => Promise<void>;
  resending?: boolean;
  refreshing?: boolean;
}

export function EmailVerificationNotice({
  email,
  onResend,
  onRefresh,
  resending = false,
  refreshing = false,
}: EmailVerificationNoticeProps) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-left">
      <p className="text-sm text-amber-900 font-semibold">
        Confirm your email to continue
      </p>
      <p className="text-xs text-amber-800/80 mt-1">
        We sent a verification link to{" "}
        <span className="font-medium">{email || "your inbox"}</span>. Please
        verify your address before accessing the dashboard.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="inline-flex items-center justify-center rounded-xl bg-amber-600/10 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-600/20 transition disabled:opacity-60"
        >
          {resending ? "Sending..." : "Resend link"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center rounded-xl border border-amber-600/30 px-4 py-2 text-sm font-semibold text-amber-900/80 hover:bg-amber-600/10 transition disabled:opacity-60"
        >
          {refreshing ? "Checking..." : "I verified already"}
        </button>
      </div>
    </div>
  );
}
