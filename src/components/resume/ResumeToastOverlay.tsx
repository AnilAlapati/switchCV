import React from "react";

export type ResumeToast = {
  tone: "success" | "error" | "info" | "warning";
  message: string;
};

interface ResumeToastOverlayProps {
  toast: ResumeToast | null;
  onDismiss: () => void;
}

const toneStyles: Record<ResumeToast["tone"], string> = {
  success: "border-emerald-400/50 bg-emerald-600/90",
  error: "border-red-400/50 bg-red-600/90",
  warning: "border-yellow-300/60 bg-yellow-400/90 text-slate-900",
  info: "border-blue-400/60 bg-blue-600/90",
};

export const ResumeToastOverlay: React.FC<ResumeToastOverlayProps> = ({
  toast,
  onDismiss,
}) => {
  if (!toast) return null;

  const baseClasses =
    "pointer-events-auto w-full max-w-md rounded-2xl border px-6 py-4 text-center text-sm font-medium shadow-2xl backdrop-blur";
  const toneClassName = toneStyles[toast.tone];
  const dismissClasses =
    toast.tone === "warning"
      ? "border-slate-900/30 text-slate-900 hover:border-slate-900/60"
      : "border-white/40 text-white hover:border-white/70";

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className={`${baseClasses} ${toneClassName}`}>
        <p>{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className={`mt-3 inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold transition ${dismissClasses}`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
