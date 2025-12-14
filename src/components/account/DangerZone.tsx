"use client";

import { useState } from "react";

export function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = () => {
    // This is where you would call the delete API
    alert("Account deletion is disabled in this demo.");
    setShowConfirm(false);
  };

  return (
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

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Are you sure?
              </h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. All your data will be lost.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
