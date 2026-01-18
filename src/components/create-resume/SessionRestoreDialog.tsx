"use client";

import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";

interface SessionRestoreDialogProps {
  onContinue: () => void;
  onStartFresh: () => void;
  messageCount: number;
  lastActivity?: Date;
}

export function SessionRestoreDialog({
  onContinue,
  onStartFresh,
  messageCount,
  lastActivity,
}: SessionRestoreDialogProps) {
  const formatLastActivity = () => {
    if (!lastActivity) return "recently";
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFF8] rounded-xl shadow-2xl max-w-md w-full border border-black/10 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Paper texture overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

        <div className="p-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5 text-black/70" />
            </div>

            <h2 className="text-2xl font-serif font-bold text-black mb-2 tracking-tight">
              Resume Previous Session?
            </h2>

            <p className="text-slate-600 leading-relaxed">
              You left a resume in progress with{" "}
              <span className="font-semibold text-black">
                {messageCount} message{messageCount !== 1 ? "s" : ""}
              </span>{" "}
              from {formatLastActivity()}.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onContinue}
              className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3.5 rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Continue Where I Left Off
            </button>

            <button
              onClick={onStartFresh}
              className="w-full bg-white hover:bg-gray-50 text-slate-600 hover:text-black px-6 py-3.5 rounded-lg font-medium text-base flex items-center justify-center gap-2 transition-all border border-slate-200 hover:border-slate-300"
            >
              <Sparkles className="w-4 h-4" />
              Start Fresh Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
