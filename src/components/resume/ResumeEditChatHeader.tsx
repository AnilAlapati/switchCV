"use client";

interface ResumeEditChatHeaderProps {
  connectionStatus?: { connected: boolean; model?: string } | null;
  resumeTitle?: string | null;
}

export function ResumeEditChatHeader({
  connectionStatus,
  resumeTitle,
}: ResumeEditChatHeaderProps) {
  return (
    <div className="p-6 border-b border-white/50 bg-white/30 backdrop-blur-md">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center">
              <span className="text-3xl font-bold text-[#2C4A3B] tracking-tight">
                Switch
              </span>
              <span className="text-3xl font-bold text-[#1A2F25]">CV</span>
            </div>
            <span className="hidden sm:inline text-[#2C4A3B]/40 text-xl font-light">|</span>
            <span className="text-xl font-bold text-[#1A2F25]/80">
              AI Resume Editor
            </span>
          </div>
          <p className="text-[#1A2F25]/70 text-sm font-medium">
            {resumeTitle
              ? `Editing ${resumeTitle}. Describe the changes you want and I will handle the details.`
              : "Tell me what you would like to add, refresh, or remove and I will guide you through the update."}
          </p>
        </div>
        {connectionStatus && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto shadow-sm ${connectionStatus.connected
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
          >
            {connectionStatus.connected
              ? `✓ ${connectionStatus.model ?? "Gemini"} Connected`
              : "⚠️ AI Unavailable"}
          </div>
        )}
      </div>
    </div>
  );
}
