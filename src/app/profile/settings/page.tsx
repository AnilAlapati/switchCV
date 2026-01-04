"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AccountInformation } from "@/components/settings/AccountInformation";
import { ProfileDetails } from "@/components/settings/ProfileDetails";
import { Notification } from "@/components/settings/Notification";
import { getVerificationRoute } from "@/lib/config";

const VERIFICATION_ROUTE = getVerificationRoute();

interface UserSettings {
  isRecruiter: boolean;
  displayName: string;
  companyName: string;
  updatedAt: string;
}

import { useUserSettings } from "@/hooks/useUserSettings";
import { ProfileSettingsSkeleton } from "@/components/settings/ProfileSettingsSkeleton";

export default function SettingsPage() {
  const {
    user,
    logout,
    loading: authLoading,
    needsEmailVerification,
  } = useAuth();
  const { resumeId, hasResume } = useResume();
  const router = useRouter();

  // SWR Hook
  const { settings: fetchedSettings, loading: settingsLoading, mutate: mutateSettings } = useUserSettings();
  const { mutate: mutateProfile } = useUserProfile();

  const [settings, setSettings] = useState<UserSettings>({
    isRecruiter: false,
    displayName: "",
    companyName: "",
    updatedAt: new Date().toISOString(),
  });

  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [savingCompanyName, setSavingCompanyName] = useState(false);
  const [savingRecruiter, setSavingRecruiter] = useState(false);
  const [showCompanyInput, setShowCompanyInput] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync fetched settings to local state
  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
      setShowCompanyInput(fetchedSettings.isRecruiter);
    }
  }, [fetchedSettings]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      logger.error({ err: error }, "Failed to log out");
    }
  }, [logout, router]);

  useEffect(() => {
    if (!authLoading && (!user || needsEmailVerification)) {
      router.push(VERIFICATION_ROUTE);
      return;
    }
  }, [user, needsEmailVerification, authLoading, router]);

  const handleRecruiterToggle = async (checked: boolean) => {
    if (!user?.uid) {
      setMessage({
        type: "error",
        text: "User ID not available. Please refresh and try again.",
      });
      return;
    }

    setSavingRecruiter(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          isRecruiter: checked,
          companyName: checked ? settings.companyName : "",
        }),
      });

      if (response.ok) {
        await mutateSettings(); // Re-fetch specific user settings
        await mutateProfile(); // Force re-fetch of global user profile
        setShowCompanyInput(checked);
        setMessage({ type: "success", text: "Account type updated!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to update account type");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setSavingRecruiter(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!settings.displayName?.trim()) {
      setMessage({ type: "error", text: "Please enter a display name." });
      return;
    }

    if (!user?.uid) {
      setMessage({
        type: "error",
        text: "User ID not available. Please refresh and try again.",
      });
      return;
    }

    setSavingDisplayName(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          displayName: settings.displayName,
        }),
      });

      if (response.ok) {
        await mutateSettings();
        setMessage({ type: "success", text: "Display name saved!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to save display name");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleSaveCompanyName = async () => {
    if (!settings.companyName?.trim()) {
      setMessage({ type: "error", text: "Please enter a company name." });
      return;
    }

    if (!user?.uid) {
      setMessage({
        type: "error",
        text: "User ID not available. Please refresh and try again.",
      });
      return;
    }

    setSavingCompanyName(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          companyName: settings.companyName,
        }),
      });

      if (response.ok) {
        await mutateSettings();
        setMessage({ type: "success", text: "Company name saved!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to save company name");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setSavingCompanyName(false);
    }
  };

  const handleCopyResumeId = () => {
    if (resumeId) {
      navigator.clipboard.writeText(String(resumeId));
      setMessage({
        type: "success",
        text: "Resume ID copied to clipboard!",
      });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  if (settingsLoading && !fetchedSettings) {
    return <ProfileSettingsSkeleton />;
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user.email} onLogout={handleLogout} />

      <main className="relative z-10 max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1A2F25] to-[#2C4A3B] tracking-tight">
            Your Profile
          </h1>
          <p className="text-[#1A2F25]/60 text-lg mt-4 font-light max-w-2xl mx-auto">
            Manage your personal information and account settings in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Details (Main Focus) */}
          <div className="lg:col-span-7 space-y-8">
            <ProfileDetails
              displayName={settings.displayName}
              companyName={settings.companyName}
              updatedAt={settings.updatedAt}
              showCompanyInput={showCompanyInput}
              savingDisplayName={savingDisplayName}
              savingCompanyName={savingCompanyName}
              onDisplayNameChange={(value) =>
                setSettings({ ...settings, displayName: value })
              }
              onCompanyNameChange={(value) =>
                setSettings({ ...settings, companyName: value })
              }
              onSaveDisplayName={handleSaveDisplayName}
              onSaveCompanyName={handleSaveCompanyName}
            />
          </div>

          {/* Right Column: Account Info (Secondary) */}
          <div className="lg:col-span-5 space-y-8">
            <AccountInformation
              email={user?.email}
              resumeId={resumeId}
              hasResume={hasResume}
              isRecruiter={settings.isRecruiter}
              savingRecruiter={savingRecruiter}
              onRecruiterToggle={handleRecruiterToggle}
              onCopy={handleCopyResumeId}
            />
          </div>
        </div>

        {message && <Notification type={message.type} text={message.text} />}
      </main>
    </DashboardBackground>
  );
}
