"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export function DangerZone(): ReactElement {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = (): void => {
    // This is where you would call the delete API
    toast.info("Account deletion is disabled in this demo.");
    setShowConfirm(false);
  };

  return (
    <>
      <div className="bg-red-50 border-2 border-red-300 overflow-hidden mt-8">
        <div className="p-8">
          <h2 className="text-xl font-serif font-bold text-red-800 mb-4">
            Danger Zone
          </h2>

          <div className="flex items-center justify-between p-4 bg-white border-2 border-red-200">
            <div>
              <p className="font-bold text-red-900">Delete Account</p>
              <p className="text-sm text-red-600 font-sans">
                Permanently remove your account and all data
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-bold border-2 border-red-600 hover:bg-white hover:text-red-600 transition-colors"
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
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setShowConfirm(false)}
          ></div>

          {/* Dialog */}
          <div className="relative w-full max-w-md bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 bg-red-100 text-red-600 flex items-center justify-center mb-4 border border-red-200">
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <h3 className="text-xl font-serif font-bold text-black mb-2">
                  Are you sure?
                </h3>

                <div className="text-sm text-gray-600 space-y-2 mb-6 font-sans">
                  <p>
                    This action cannot be undone. All your data will be lost.
                  </p>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-black font-bold hover:bg-gray-200 transition-colors border-2 border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 px-4 py-2.5 font-bold text-white transition-all bg-red-600 hover:bg-red-700 border-2 border-red-600"
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
