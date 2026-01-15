"use client";

import type { ReactElement } from "react";
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

export function PreferencesSection(): ReactElement | null {
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
  ): Promise<void> => {
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
      toast.error("Failed to save changes");
      mutate();
    }
  };

  const toggleNotification = (key: keyof typeof notifications): void => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    savePreferences(updated, privacy);
  };

  const togglePrivacy = (key: keyof typeof privacy): void => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    savePreferences(notifications, updated);
  };

  if (!settings && !user) return null;

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-6">
          <div className="w-12 h-12 bg-black flex items-center justify-center text-white">
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
            <h2 className="text-2xl font-serif font-bold text-black">Preferences</h2>
            <p className="text-gray-500 text-sm font-sans">
              Customize your notifications and privacy
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-mono font-bold text-gray-500 mb-4 text-[10px] uppercase tracking-widest">
              Notifications
            </h3>
            <div className="space-y-4">
              {/* Marketing */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200">
                <div>
                  <p className="font-bold text-black">Marketing Emails</p>
                  <p className="text-xs text-gray-500 font-sans">
                    Receive updates about new features and offers
                  </p>
                </div>
                <button
                  onClick={() => toggleNotification("marketing")}
                  className={`relative inline-flex h-6 w-11 items-center transition-colors ${notifications.marketing ? "bg-black" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform bg-white transition-transform ${notifications.marketing
                        ? "translate-x-6"
                        : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
              {/* Security */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200">
                <div>
                  <p className="font-bold text-black">Security Alerts</p>
                  <p className="text-xs text-gray-500 font-sans">
                    Get notified about suspicious activity
                  </p>
                </div>
                <button
                  onClick={() => toggleNotification("security")}
                  className={`relative inline-flex h-6 w-11 items-center transition-colors ${notifications.security ? "bg-black" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform bg-white transition-transform ${notifications.security ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-gray-100">
            <h3 className="font-mono font-bold text-gray-500 mb-4 text-[10px] uppercase tracking-widest">
              Privacy
            </h3>
            <div className="space-y-4">
              {/* Profile Public */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200">
                <div>
                  <p className="font-bold text-black">Public Profile</p>
                  <p className="text-xs text-gray-500 font-sans">
                    Allow others to see your profile
                  </p>
                </div>
                <button
                  onClick={() => togglePrivacy("profilePublic")}
                  className={`relative inline-flex h-6 w-11 items-center transition-colors ${privacy.profilePublic ? "bg-black" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform bg-white transition-transform ${privacy.profilePublic ? "translate-x-6" : "translate-x-1"
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
