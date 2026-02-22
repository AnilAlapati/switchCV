"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { doc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { redirectWindow } from "@/lib/utils/window";

import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";
import { UserProfile } from "@/types";

import {
  Role,
  ROLES,
  SelectRoleHeader,
  RoleCard
} from "@/components/select-role/SelectRoleComponents";

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

      // Force refresh of user profile to update role in SWR cache immediately for UI feedback
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

      // CRITICAL FIX: The /dashboard page uses SWR which might refetch stale data from Firestore edge nodes
      // and immediately redirect the user back here.
      // 1. Give Firestore a moment to replicate the write
      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Use a hard navigation (window.location) instead of router.push().
      // This forces the entire React tree to unmount and mount fresh on /dashboard, 
      // ensuring SWR boots up fresh instead of using a potentially poisoned soft-nav cache.
      redirectWindow("/dashboard");
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

  const selectedRoleData = ROLES.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      <BackgroundBlobs />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <SelectRoleHeader />

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {ROLES.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={selectedRole === role.id}
              isSubmitting={isSubmitting}
              onSelect={setSelectedRole}
            />
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
            className={`px-10 py-4 rounded-2xl font-semibold text-white transition-all duration-300 shadow-lg ${selectedRole && !isSubmitting
              ? `bg-gradient-to-r ${selectedRoleData?.gradient} ${selectedRoleData?.hoverGradient} hover:shadow-xl hover:scale-105 hover:-translate-y-0.5`
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

