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
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Resume Assistant</h1>
          <p className="text-gray-400">Smart, conversational resume creation</p>
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
