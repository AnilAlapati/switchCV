"use client";

interface AILoadingStateProps {
  aiLoading: boolean;
  aiError: string | null;
}

export function AILoadingState({ aiLoading, aiError }: AILoadingStateProps) {
  if (!aiLoading && !aiError) {
    return null;
  }

  return (
    <>
      {/* AI Loading State */}
      {aiLoading && (
        <div className="flex flex-col items-center justify-center py-6 space-y-3 px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg px-4 py-2">
            <p className="text-blue-300 text-sm font-medium">
              🤖 AI is generating your resume...
            </p>
            <p className="text-blue-400 text-xs mt-1">
              Check browser console (F12) for live AI call details
            </p>
          </div>
        </div>
      )}

      {/* AI Error Display */}
      {aiError && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mt-4 mx-4 mb-4">
          <p className="text-red-300 text-sm">⚠️ AI Error: {aiError}</p>
          <p className="text-red-400 text-xs mt-1">
            Check browser console for error details
          </p>
        </div>
      )}
    </>
  );
}
