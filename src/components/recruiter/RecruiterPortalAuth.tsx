"use client";

interface NotAuthenticatedProps {
  userEmail?: string;
}

export function RecruiterPortalAuth({ userEmail }: NotAuthenticatedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Recruiter Portal
        </h1>
        <p className="text-gray-600 mb-6">
          You need to be logged in to access the recruiter portal
        </p>
        {userEmail && (
          <p className="text-sm text-gray-500 mb-6">
            Signed out from {userEmail}
          </p>
        )}
        <a
          href="/auth"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In
        </a>
      </div>
    </div>
  );
}
