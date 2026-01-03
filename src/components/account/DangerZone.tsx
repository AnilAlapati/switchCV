"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = () => {
    // This is where you would call the delete API
    alert("Account deletion is disabled in this demo.");
    setShowConfirm(false);
  };

  return (
    <>
      <div className="bg-red-50/50 backdrop-blur-xl rounded-3xl shadow-sm border border-red-100 overflow-hidden mt-8">
        <div className="p-8">
          <h2 className="text-xl font-bold text-red-800 mb-4">Danger Zone</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-900">Delete Account</p>
              <p className="text-sm text-red-700/70">
                Permanently remove your account and all data
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm font-bold rounded-lg hover:bg-red-200 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfirm(false)}
          ></div>

          {/* Dialog */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Are you sure?
                </h3>

                <div className="text-sm text-slate-600 space-y-2 mb-6">
                  <p>
                    This action cannot be undone. All your data will be lost.
                  </p>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white shadow-lg transition-all transform active:scale-95 bg-red-600 hover:bg-red-700 shadow-red-500/20"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
