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
    <div className="p-6 border-b border-gray-700/50 bg-gray-800/40 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center">
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Switch
              </span>
              <span className="text-3xl font-bold text-white">CV</span>
            </div>
            <span className="hidden sm:inline text-gray-500 text-xl">|</span>
            <span className="text-xl font-semibold text-gray-300">
              AI Resume Editor
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {resumeTitle
              ? `Editing ${resumeTitle}. Describe the changes you want and I will handle the details.`
              : "Tell me what you would like to add, refresh, or remove and I will guide you through the update."}
          </p>
        </div>
        {connectionStatus && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
              connectionStatus.connected
                ? "bg-green-900/30 text-green-300 border border-green-500/50"
                : "bg-red-900/30 text-red-300 border border-red-500/50"
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
