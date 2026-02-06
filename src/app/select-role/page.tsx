/* eslint-disable max-lines */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { doc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";
import { UserProfile } from "@/types";

type Role = "jobseeker" | "recruiter";

const ROLES = [
  {
    id: "jobseeker" as Role,
    title: "Job Seeker",
    description: "I'm looking for my next opportunity",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    features: [
      "Create AI-powered resumes",
      "Track who views your resume",
      "Control your contact info privacy",
    ],
    // Updated for Aura theme
    gradient: "from-teal-400 to-emerald-500",
    hoverGradient: "hover:from-teal-300 hover:to-emerald-400",
    borderColor: "border-teal-400/50",
    bgColor: "bg-teal-400/5",
    activeBg: "bg-teal-400/10",
  },
  {
    id: "recruiter" as Role,
    title: "Recruiter",
    description: "I'm hiring talent for my team",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    features: [
      "AI-powered candidate search",
      "Request contact information",
      "Manage candidate pipeline",
    ],
    // Updated for Aura theme
    gradient: "from-blue-400 to-indigo-500",
    hoverGradient: "hover:from-blue-300 hover:to-indigo-400",
    borderColor: "border-blue-400/50",
    bgColor: "bg-blue-400/5",
    activeBg: "bg-blue-400/10",
  },
];

export default function SelectRolePage() {
  const { user, loading } = useAuth();
  const {
    mutate,
    role: existingRole,
    loading: profileLoading,
  } = useUserProfile();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  // Redirect if role is already selected
  useEffect(() => {
    if (
      !loading &&
      !profileLoading &&
      existingRole &&
      (existingRole === "jobseeker" || existingRole === "recruiter")
    ) {
      router.replace("/dashboard");
    }
  }, [loading, profileLoading, existingRole, router]);

  // Show nothing while redirecting
  if (!loading && !user) {
    return null;
  }

  if (
    !loading &&
    !profileLoading &&
    existingRole &&
    (existingRole === "jobseeker" || existingRole === "recruiter")
  ) {
    return null;
  }

  const handleSelectRole = async () => {
    if (!selectedRole || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get fresh ID token
      const idToken = await user.getIdToken();

      // Use API route to set role (bypasses client-side Firestore rules)
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      // Increment the appropriate counter in global stats
      // We keep this client-side as it might fail silently without blocking the user flow
      // or we can move it to the API, but for now let's focus on unblocking the user.
      // Actually, relying on client-side rules for stats is also risky.
      // Ideally the API should do this, but let's leave the stats update here for now if it works,
      // or wrapped in a try-catch so it doesn't fail the whole flow.
      try {
        const statsRef = doc(db, "analytics", "globalStats");
        const statsField =
          selectedRole === "jobseeker" ? "jobSeekerCount" : "recruiterCount";
        await setDoc(statsRef, { [statsField]: increment(1) }, { merge: true });
      } catch (statsErr) {
        // Ignore stats error
        logger.warn({ statsErr }, "Failed to update global stats");
      }

      logger.info(
        { userId: user.uid, role: selectedRole },
        "User selected role",
      );

      // Force refresh of user profile to update role in SWR cache
      // We use optimistic update here to ensure the local cache has the new role immediately
      // setting revalidate: false prevents SWR from fetching the stale data from the server (which might be cached by the browser)
      await mutate(
        (currentProfile: unknown) => {
          if (!currentProfile) return null;
          const profile = currentProfile as UserProfile;
          return {
            ...profile,
            role: selectedRole,
          };
        },
        { revalidate: false },
      );

      // Redirect based on role
      if (selectedRole === "jobseeker") {
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      logger.error(
        { err, errorCode: error.code, userId: user?.uid },
        "Failed to set user role",
      );
      setError(`Error: ${error.message || "Something went wrong"}`);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF8]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      <BackgroundBlobs />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-black mb-6 shadow-lg">
            <svg
              className="w-8 h-8 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3 text-black">
            How will you use SwitchCV?
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Choose your role to get a personalized experience. You can always
            change this later in settings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              disabled={isSubmitting}
              className={`relative p-8 rounded-[2rem] border-2 transition-all duration-300 text-left group ${
                selectedRole === role.id
                  ? `${role.borderColor.replace("/50", "")} ${
                      role.activeBg
                    } bg-white shadow-xl`
                  : "border-white/40 bg-white/40 hover:bg-white/60 hover:border-white/60 hover:shadow-lg"
              } ${
                isSubmitting
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {/* Selected indicator */}
              {selectedRole === role.id && (
                <div className="absolute top-6 right-6">
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-r ${role.gradient} flex items-center justify-center shadow-sm`}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-6 shadow-md text-white group-hover:scale-105 transition-transform duration-300`}
              >
                {role.icon}
              </div>

              {/* Content */}
              <h2 className="text-xl font-bold mb-2 text-black">
                {role.title}
              </h2>
              <p className="text-gray-600 text-sm mb-6">{role.description}</p>

              {/* Features */}
              <ul className="space-y-3">
                {role.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <div
                      className={`p-1 rounded-full ${
                        selectedRole === role.id
                          ? role.id === "jobseeker"
                            ? "bg-teal-100 text-teal-600"
                            : "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSelectRole}
            disabled={!selectedRole || isSubmitting}
            className={`px-10 py-4 rounded-2xl font-semibold text-white transition-all duration-300 shadow-lg ${
              selectedRole && !isSubmitting
                ? `bg-gradient-to-r ${
                    ROLES.find((r) => r.id === selectedRole)?.gradient
                  } ${
                    ROLES.find((r) => r.id === selectedRole)?.hoverGradient
                  } hover:shadow-xl hover:scale-105 hover:-translate-y-0.5`
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Setting up...
              </span>
            ) : (
              "Continue to Dashboard"
            )}
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8 pb-8 font-sans">
          Your choice helps us show you the right features. Both roles have
          access to core functionality.
        </p>
      </div>
    </div>
  );
}
