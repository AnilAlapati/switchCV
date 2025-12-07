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

export default function SettingsPage() {
  const {
    user,
    logout,
    loading: authLoading,
    needsEmailVerification,
  } = useAuth();
  const { resumeId, hasResume } = useResume();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    isRecruiter: false,
    displayName: "",
    companyName: "",
    updatedAt: new Date().toISOString(),
  });
  const [saving, setSaving] = useState(false);
  const [showCompanyInput, setShowCompanyInput] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      logger.error({ err: error }, "Failed to log out");
    }
  }, [logout, router]);

  const fetchSettings = useCallback(async () => {
    try {
      if (!user) return;

      const idToken = await user.getIdToken();
      const response = await fetch(`/api/user/settings?userId=${user.uid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      setSettings(data);
      setShowCompanyInput(data.isRecruiter);
    } catch (err) {
      logger.error({ err: err }, "Error fetching settings:");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || needsEmailVerification)) {
      router.push(VERIFICATION_ROUTE);
      return;
    }

    if (user && !needsEmailVerification) {
      fetchSettings();
    }
  }, [user, needsEmailVerification, authLoading, router, fetchSettings]);

  const { mutate } = useUserProfile();

  const handleRecruiterToggle = async (checked: boolean) => {
    if (!user?.uid) {
      setMessage({
        type: "error",
        text: "User ID not available. Please refresh and try again.",
      });
      return;
    }

    setSaving(true);
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
        await fetchSettings(); // Re-fetch to get the latest data
        await mutate(); // Force re-fetch of global user profile to update dashboard role state
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
      setSaving(false);
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

    setSaving(true);
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
        await fetchSettings(); // Re-fetch to get the latest data
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
      setSaving(false);
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

    setSaving(true);
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
        await fetchSettings(); // Re-fetch to get the latest data
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
      setSaving(false);
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

  if (authLoading) {
    return (
      <DashboardBackground>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#2C4A3B]/20 border-t-[#2C4A3B] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#1A2F25]/70 text-lg">Loading settings...</p>
          </div>
        </div>
      </DashboardBackground>
    );
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user.email} onLogout={handleLogout} />

      <main className="relative z-10 max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1A2F25]">
            Settings & Profile
          </h1>
          <p className="text-[#1A2F25]/70 text-lg mt-2">
            Manage your account and profile information
          </p>
        </div>

        <AccountInformation
          email={user?.email}
          resumeId={resumeId}
          hasResume={hasResume}
          isRecruiter={settings.isRecruiter}
          saving={saving}
          onRecruiterToggle={handleRecruiterToggle}
          onCopy={handleCopyResumeId}
        />

        <ProfileDetails
          displayName={settings.displayName}
          companyName={settings.companyName}
          updatedAt={settings.updatedAt}
          showCompanyInput={showCompanyInput}
          saving={saving}
          onDisplayNameChange={(value) =>
            setSettings({ ...settings, displayName: value })
          }
          onCompanyNameChange={(value) =>
            setSettings({ ...settings, companyName: value })
          }
          onSaveDisplayName={handleSaveDisplayName}
          onSaveCompanyName={handleSaveCompanyName}
        />

        {message && <Notification type={message.type} text={message.text} />}
      </main>
    </DashboardBackground>
  );
}
