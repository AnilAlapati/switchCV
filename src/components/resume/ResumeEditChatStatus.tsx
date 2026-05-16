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
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"
            role="status"
          ></div>
          <div className="border border-gray-200 bg-gray-50 px-4 py-2 text-center">
            <p className="text-gray-900 text-sm font-bold">
              Applying your resume updates...
            </p>
            <p className="text-gray-500 text-xs mt-1">
              You can keep this tab open. Changes are saved automatically.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-4 mt-4 mx-4 mb-4">
          <p className="text-red-700 text-sm font-bold">
            AI Error: {errorMessage}
          </p>
          <p className="text-red-600 text-xs mt-1">
            Please try phrasing the change again. If the problem persists, the
            manual editor is available as a fallback.
          </p>
        </div>
      )}
    </>
  );
}
