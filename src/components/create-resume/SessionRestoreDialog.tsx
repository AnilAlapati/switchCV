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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border-2 border-amber-500/30 animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center flex-shrink-0 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Resume Previous Session?
              </h2>
              <p className="text-base text-slate-200 leading-relaxed">
                You have an in-progress resume creation with{" "}
                <span className="font-semibold text-amber-300">
                  {messageCount} message{messageCount !== 1 ? "s" : ""}
                </span>{" "}
                from {formatLastActivity()}.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/10 rounded-xl p-4 mb-6 border border-amber-500/30 shadow-inner">
            <p className="text-sm text-slate-100 leading-relaxed">
              <span className="font-semibold text-amber-300">💡 Tip:</span>{" "}
              Continuing will restore your conversation and progress. Starting
              fresh will create a new resume from scratch.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onContinue}
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-6 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-primary/30 border border-primary/50"
            >
              <RefreshCw className="w-5 h-5" />
              Continue Previous Session
            </button>

            <button
              onClick={onStartFresh}
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-white px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] border-2 border-slate-600/50 hover:border-slate-500"
            >
              <Sparkles className="w-5 h-5" />
              Start Fresh Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
