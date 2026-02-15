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
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#2C4A3B]" role="status"></div>
          <div className="bg-[#2C4A3B]/5 border border-[#2C4A3B]/20 rounded-lg px-4 py-2 text-center">
            <p className="text-[#2C4A3B] text-sm font-bold">
              ✨ Applying your resume updates...
            </p>
            <p className="text-[#2C4A3B]/80 text-xs mt-1">
              You can keep this tab open. I will confirm once the changes are
              saved.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mt-4 mx-4 mb-4">
          <p className="text-rose-700 text-sm font-bold">⚠️ AI Error: {errorMessage}</p>
          <p className="text-rose-600 text-xs mt-1">
            Please try phrasing the change again. If the problem persists, the
            manual editor is available as a fallback.
          </p>
        </div>
      )}
    </>
  );
}
