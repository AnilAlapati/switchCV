"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

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
    gradient: "from-cyan-500 to-blue-600",
    hoverGradient: "hover:from-cyan-400 hover:to-blue-500",
    borderColor: "border-cyan-500",
    bgColor: "bg-cyan-500/10",
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
    gradient: "from-purple-500 to-pink-600",
    hoverGradient: "hover:from-purple-400 hover:to-pink-500",
    borderColor: "border-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export default function SelectRolePage() {
  const { user, loading } = useAuth();
  const { mutate } = useUserProfile();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  if (!loading && !user) {
    router.replace("/auth");
    return null;
  }

  const handleSelectRole = async () => {
    if (!selectedRole || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          role: selectedRole,
          roleSelectedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Increment the appropriate counter in global stats
      const statsRef = doc(db, "analytics", "globalStats");
      const statsField =
        selectedRole === "jobseeker" ? "jobSeekerCount" : "recruiterCount";
      await setDoc(statsRef, { [statsField]: increment(1) }, { merge: true });

      logger.info(
        { userId: user.uid, role: selectedRole },
        "User selected role"
      );

      // Force refresh of user profile to update role in SWR cache
      await mutate();

      // Redirect based on role
      if (selectedRole === "jobseeker") {
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      logger.error({ err, userId: user?.uid }, "Failed to set user role");
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl mb-6">
            <svg
              className="w-8 h-8 text-white"
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            How will you use SwitchCV?
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Choose your role to get a personalized experience. You can always
            change this later in settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              disabled={isSubmitting}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                selectedRole === role.id
                  ? `${role.borderColor} ${role.bgColor}`
                  : "border-white/10 hover:border-white/20 bg-white/5"
              } ${
                isSubmitting
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {/* Selected indicator */}
              {selectedRole === role.id && (
                <div className="absolute top-4 right-4">
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-r ${role.gradient} flex items-center justify-center`}
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
                className={`w-14 h-14 rounded-xl bg-gradient-to-r ${role.gradient} flex items-center justify-center mb-4`}
              >
                {role.icon}
              </div>

              {/* Content */}
              <h2 className="text-xl font-semibold mb-1">{role.title}</h2>
              <p className="text-slate-400 text-sm mb-4">{role.description}</p>

              {/* Features */}
              <ul className="space-y-2">
                {role.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <svg
                      className={`w-4 h-4 ${
                        selectedRole === role.id
                          ? "text-cyan-400"
                          : "text-slate-500"
                      }`}
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
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSelectRole}
            disabled={!selectedRole || isSubmitting}
            className={`px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-200 ${
              selectedRole && !isSubmitting
                ? `bg-gradient-to-r ${
                    ROLES.find((r) => r.id === selectedRole)?.gradient
                  } ${
                    ROLES.find((r) => r.id === selectedRole)?.hoverGradient
                  } hover:shadow-lg hover:scale-105`
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
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
              "Continue"
            )}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Your choice helps us show you the right features. Both roles have
          access to core functionality.
        </p>
      </div>
    </div>
  );
}
