"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Settings {
  notifications: {
    marketing: boolean;
    security: boolean;
    activity: boolean;
  };
  privacy: {
    profilePublic: boolean;
    searchable: boolean;
  };
}

export function PreferencesSection() {
  const { user } = useAuth();
  const { data: settings, mutate } = useSWR<Settings>(
    user ? `/api/user/settings?userId=${user.uid}` : null,
    fetcher
  );

  const [notifications, setNotifications] = useState({
    marketing: true,
    security: true,
    activity: false,
  });

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    searchable: true,
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (settings) {
      if (settings.notifications) setNotifications(settings.notifications);
      if (settings.privacy) setPrivacy(settings.privacy);
    }
  }, [settings]);

  const savePreferences = async (
    newNotifications: typeof notifications,
    newPrivacy: typeof privacy
  ) => {
    if (!user) return;

    try {
      // Optimistic update
      mutate(
        { ...settings!, notifications: newNotifications, privacy: newPrivacy },
        false
      );

      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          notifications: newNotifications,
          privacy: newPrivacy,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Preferences saved");
      mutate(); // Revalidate
    } catch {
      // console.error('Failed to save preferences:', error);
      toast.error("Failed to save changes");
      // Rollback is handled by revalidation on next focus/interaction or manual revalidation
      mutate();
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated); // Immediate UI feedback
    savePreferences(updated, privacy);
  };

  const togglePrivacy = (key: keyof typeof privacy) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated); // Immediate UI feedback
    savePreferences(notifications, updated);
  };

  if (!settings && !user) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2C4A3B] to-[#1A2F25] flex items-center justify-center shadow-lg shadow-[#2C4A3B]/20 text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1A2F25]">Preferences</h2>
            <p className="text-[#1A2F25]/50 text-sm font-medium">
              Customize your notifications and privacy
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-[#1A2F25] mb-4 text-sm uppercase tracking-wider opacity-60">
              Notifications
            </h3>
            <div className="space-y-4">
              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1A2F25]">Marketing Emails</p>
                  <p className="text-xs text-[#1A2F25]/60">
                    Receive updates about new features and offers
                  </p>
                </div>
                <button
                  onClick={() => toggleNotification("marketing")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.marketing ? "bg-[#2C4A3B]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.marketing
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {/* Security */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1A2F25]">Security Alerts</p>
                  <p className="text-xs text-[#1A2F25]/60">
                    Get notified about suspicious activity
                  </p>
                </div>
                <button
                  onClick={() => toggleNotification("security")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.security ? "bg-[#2C4A3B]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.security ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-[#1A2F25] mb-4 text-sm uppercase tracking-wider opacity-60">
              Privacy
            </h3>
            <div className="space-y-4">
              {/* Profile Public */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1A2F25]">Public Profile</p>
                  <p className="text-xs text-[#1A2F25]/60">
                    Allow others to see your profile
                  </p>
                </div>
                <button
                  onClick={() => togglePrivacy("profilePublic")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacy.profilePublic ? "bg-[#2C4A3B]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacy.profilePublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
