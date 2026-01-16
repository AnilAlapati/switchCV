"use client";

import React from "react";

export const MaintenancePage = (): React.JSX.Element => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] px-4 text-center text-white">
      <div className="max-w-[600px]">
        <div className="mb-8 text-6xl">🔧</div>
        <h1 className="mb-4 text-5xl font-bold">Under Maintenance</h1>
        <p className="mb-8 text-xl opacity-90">
          We&apos;re making improvements to serve you better.
        </p>
        <p className="text-base opacity-70">
          We&apos;ll be back soon. Thank you for your patience!
        </p>
      </div>
    </div>
  );
};
