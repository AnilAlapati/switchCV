"use client";

interface ResumeEditChatStatusProps {
  isProcessing: boolean;
  errorMessage: string | null;
}

export function ResumeEditChatStatus({
  isProcessing,
  errorMessage,
}: ResumeEditChatStatusProps) {
  if (!isProcessing && !errorMessage) {
    return null;
  }

  return (
    <>
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-6 space-y-3 px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-500"></div>
          <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg px-4 py-2 text-center">
            <p className="text-cyan-200 text-sm font-medium">
              ✨ Applying your resume updates...
            </p>
            <p className="text-cyan-300 text-xs mt-1">
              You can keep this tab open. I will confirm once the changes are
              saved.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mt-4 mx-4 mb-4">
          <p className="text-red-300 text-sm">⚠️ AI Error: {errorMessage}</p>
          <p className="text-red-400 text-xs mt-1">
            Please try phrasing the change again. If the problem persists, the
            manual editor is available as a fallback.
          </p>
        </div>
      )}
    </>
  );
}
