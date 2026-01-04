"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useJobSeekerProfile } from "@/hooks/useJobSeekerProfile";
import { ProfileEditorSkeleton } from "@/components/profile/ProfileEditorSkeleton";
import { ResumeProfile } from "@/types";
import { logger } from "@/lib/logger";

export default function ProfileEditor() {
  const { user } = useAuth();
  const { profile: serverProfile, loading, mutate } = useJobSeekerProfile();

  const [profile, setProfile] = useState<Partial<ResumeProfile>>({
    contact: {
      email: { value: "", visibility: "public" },
      phone: { value: "", visibility: "public" },
    },
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (serverProfile) {
      setProfile(serverProfile);
    }
  }, [serverProfile]);

  const updateProfile = (updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!user) {
      setSaveMessage("You must be logged in to save your profile.");
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/jobseeker/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      await mutate(); // Update SWR cache
      logger.info({ userId: user.uid }, "Profile saved successfully");
      setSaveMessage("Profile saved successfully!");
    } catch (error) {
      logger.error({ err: error, userId: user?.uid }, "Failed to save profile");
      setSaveMessage("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !serverProfile) {
    return <ProfileEditorSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Your Resume</h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Resume Title
            </label>
            <input
              type="text"
              value={profile.title || ""}
              onChange={(e) => updateProfile({ title: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Professional Summary
            </label>
            <textarea
              value={profile.summary || ""}
              onChange={(e) => updateProfile({ summary: e.target.value })}
              rows={4}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={profile.contact?.email?.value || ""}
              onChange={(e) =>
                updateProfile({
                  contact: {
                    ...profile.contact!,
                    email: {
                      ...profile.contact!.email!,
                      value: e.target.value,
                    },
                  },
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              value={profile.contact?.phone?.value || ""}
              onChange={(e) =>
                updateProfile({
                  contact: {
                    ...profile.contact!,
                    phone: {
                      ...profile.contact!.phone!,
                      value: e.target.value,
                    },
                  },
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div className="flex justify-end items-center gap-4">
            {saveMessage && (
              <span
                className={`text-sm ${saveMessage.includes("success")
                    ? "text-green-600"
                    : "text-red-600"
                  }`}
              >
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
