"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useRouter } from "next/navigation";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AccountInformation } from "@/components/settings/AccountInformation";
import { ProfileDetails } from "@/components/settings/ProfileDetails";
import { Notification } from "@/components/settings/Notification";
import { getVerificationRoute } from "@/lib/config";

const VERIFICATION_ROUTE = getVerificationRoute();

import { useUserSettings } from "@/hooks/useUserSettings";
import { ProfileSettingsSkeleton } from "@/components/settings/ProfileSettingsSkeleton";
import { UserSettings } from "./types";
import { useSettingsHandlers } from "./useSettingsHandlers";
import { SettingsHeader } from "./SettingsComponents";

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
  const {
    settings: fetchedSettings,
    loading: settingsLoading,
    mutate: mutateSettings,
  } = useUserSettings();

  const [settings, setSettings] = useState<UserSettings>({
    isRecruiter: false,
    displayName: "",
    companyName: "",
    updatedAt: new Date().toISOString(),
  });

  const [showCompanyInput, setShowCompanyInput] = useState(false);

  // Custom Hub for Handlers
  const {
    savingDisplayName,
    savingCompanyName,
    savingRecruiter,
    message,
    setMessage,
    handleRecruiterToggle,
    handleSaveDisplayName,
    handleSaveCompanyName,
  } = useSettingsHandlers(
    user,
    settings,
    setSettings,
    mutateSettings,
    setShowCompanyInput,
  );

  // Sync fetched settings to local state
  useEffect(() => {
    if (fetchedSettings && fetchedSettings.updatedAt !== settings.updatedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings({
        ...fetchedSettings,
        displayName: fetchedSettings.displayName ?? "",
        companyName: fetchedSettings.companyName ?? "",
      });
      setShowCompanyInput(fetchedSettings.isRecruiter);
    }
  }, [fetchedSettings, settings.updatedAt]);

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
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }
    if (!authLoading && user && needsEmailVerification) {
      router.push(VERIFICATION_ROUTE);
    }
  }, [user, needsEmailVerification, authLoading, router]);

  const handleCopyResumeId = () => {
    if (resumeId) {
      navigator.clipboard.writeText(String(resumeId));
      setMessage({
        type: "success",
        text: "Resume ID copied to clipboard!",
      });
      // Cleared automatically by the useEffect in useSettingsHandlers
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
        <SettingsHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
