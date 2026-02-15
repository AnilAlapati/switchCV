"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteResumeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
    isBasicUser: boolean;
}

export function DeleteResumeDialog({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
    isBasicUser,
}: DeleteResumeDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={isDeleting ? undefined : onClose}
            ></div>

            {/* Dialog */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={isDeleting}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-500 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-6">
                    <div className="flex flex-col items-center text-center">
                        {isBasicUser ? (
                            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                        ) : (
                            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-4">
                                <Trash2 className="h-6 w-6" />
                            </div>
                        )}

                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {isBasicUser ? "Warning: Permanent Action" : "Delete Resume?"}
                        </h3>

                        <div className="text-sm text-slate-600 space-y-2 mb-6">
                            {isBasicUser ? (
                                <>
                                    <p className="font-medium text-red-600">
                                        You are on the Basic plan which is limited to one resume.
                                    </p>
                                    <p>
                                        If you delete this resume, you will lose all its data permanently. This action cannot be undone.
                                    </p>
                                </>
                            ) : (
                                <p>
                                    Are you sure you want to delete this resume? This action cannot be undone.
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isDeleting}
                                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${isBasicUser
                                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                                    : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                                    }`}
                            >
                                {isDeleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" />
                                        Deleting...
                                    </span>
                                ) : (
                                    "Delete Resume"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
