"use client";

interface ResumeProgressProps {
  progress: number;
  collectedFields?: string[];
  missingFields?: string[];
}

export function ResumeProgress({
  progress,
  collectedFields = [],
  missingFields = [],
}: ResumeProgressProps) {
  if (progress === 0) return null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300">
          Resume Progress
        </span>
        <span className="text-sm font-bold text-cyan-400">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Collected fields */}
      {collectedFields.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">✓ Collected:</p>
          <div className="flex flex-wrap gap-2">
            {collectedFields.map((field) => (
              <span
                key={field}
                className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded-md border border-green-500/30"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing fields */}
      {missingFields.length > 0 && missingFields.length <= 5 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">⏳ Still need:</p>
          <div className="flex flex-wrap gap-2">
            {missingFields.slice(0, 5).map((field) => (
              <span
                key={field}
                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md border border-gray-600/30"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Completion message */}
      {progress >= 100 && (
        <div className="mt-3 p-2 bg-gradient-to-r from-green-900/30 to-cyan-900/30 rounded-lg border border-green-500/30">
          <p className="text-sm text-green-300 font-medium text-center">
            ✨ All information collected! Creating your resume...
          </p>
        </div>
      )}
    </div>
  );
}
