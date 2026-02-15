import React from "react";

interface DeleteRequestDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  candidateName: string;
}

export function DeleteRequestDialog({
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
  candidateName,
}: DeleteRequestDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-w-sm w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/60 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="w-6 h-6 text-red-500"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Request?
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Are you sure you want to delete your access request for{" "}
              <span className="text-cyan-400 font-medium">{candidateName}</span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-900 disabled:to-red-900 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
          >
            {isDeleting ? (
              <>
                <span
                  className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                  role="status"
                />
                Deleting...
              </>
            ) : (
              <>Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
