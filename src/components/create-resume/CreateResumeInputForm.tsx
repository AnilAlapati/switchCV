"use client";

interface CreateResumeInputFormProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  stage: string;
}

export function CreateResumeInputForm({
  currentInput,
  onInputChange,
  onSubmit,
  stage,
}: CreateResumeInputFormProps) {
  return (
    <div className="p-4 border-t border-gray-700">
      <form onSubmit={onSubmit} className="flex space-x-2">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={
            stage === "generating"
              ? "Generating your resume..."
              : stage === "complete"
              ? "Resume ready! Check above."
              : "Type your response here..."
          }
          className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={stage === "generating" || stage === "complete"}
        />
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            !currentInput.trim() ||
            stage === "generating" ||
            stage === "complete"
          }
        >
          {stage === "generating" ? "Generating..." : "Send"}
        </button>
      </form>
    </div>
  );
}
