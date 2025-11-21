"use client";

interface AIConnectionStatus {
  connected: boolean;
  model?: string;
}

interface CreateResumeHeaderProps {
  aiConnectionStatus?: AIConnectionStatus | null;
}

export function CreateResumeHeader({
  aiConnectionStatus,
}: CreateResumeHeaderProps) {
  return (
    <div className="p-6 border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center">
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Switch
              </span>
              <span className="text-3xl font-bold text-white">CV</span>
            </div>
            <span className="text-gray-500 text-xl">|</span>
            <span className="text-xl font-semibold text-gray-300">
              AI Resume Builder
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Create your professional resume with AI assistance
          </p>
        </div>
        {aiConnectionStatus && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              aiConnectionStatus.connected
                ? "bg-green-900/30 text-green-300 border border-green-500/50"
                : "bg-red-900/30 text-red-300 border border-red-500/50"
            }`}
          >
            {aiConnectionStatus.connected
              ? `✓ ${aiConnectionStatus.model} Connected`
              : "⚠️ AI Unavailable"}
          </div>
        )}
      </div>
    </div>
  );
}
