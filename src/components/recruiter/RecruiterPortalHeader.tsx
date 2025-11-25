"use client";

interface RecruiterPortalHeaderProps {
  subtitle?: string;
}

export function RecruiterPortalHeader({
  subtitle = "Search candidates and request access to their contact information",
}: RecruiterPortalHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Recruiter Portal</h1>
        <p className="text-gray-600 mt-2">{subtitle}</p>
      </div>
    </div>
  );
}
