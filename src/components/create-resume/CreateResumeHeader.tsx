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
    <div className="p-6 border-b border-white/20 bg-card/30 backdrop-blur-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center">
              <span className="text-3xl font-bold text-primary">Switch</span>
              <span className="text-3xl font-bold text-foreground">CV</span>
            </div>
            <span className="text-muted-foreground/50 text-xl">|</span>
            <span className="text-xl font-semibold text-muted-foreground">
              AI Resume Builder
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Create your professional resume with AI assistance
          </p>
        </div>
        {aiConnectionStatus && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              aiConnectionStatus.connected
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-red-100 text-red-700 border border-red-200"
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
