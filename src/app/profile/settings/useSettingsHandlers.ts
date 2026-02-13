import { useState } from "react";
import { UserSettings } from "./types";
import { User } from "firebase/auth";

import { KeyedMutator } from "swr";

export function useSettingsHandlers(
    user: User | null,
    settings: UserSettings,
    setSettings: (s: UserSettings) => void,
    mutateSettings: KeyedMutator<UserSettings>,
    setShowCompanyInput: (v: boolean) => void
) {
    const [savingDisplayName, setSavingDisplayName] = useState(false);
    const [savingCompanyName, setSavingCompanyName] = useState(false);
    const [savingRecruiter, setSavingRecruiter] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

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
            const response = await fetch("/api/user/update-role", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    uid: user.uid,
                    newRole: checked ? "recruiter" : "jobseeker",
                    companyName: checked ? settings.companyName : "",
                }),
            });

            if (response.ok) {
                await user.getIdToken(true);
                const newSettings = {
                    ...settings,
                    isRecruiter: checked,
                    companyName: checked ? (settings.companyName ?? "") : "",
                };
                await mutateSettings(newSettings, { revalidate: false });
                setSettings(newSettings);
                setShowCompanyInput(checked);
                setMessage({
                    type: "success",
                    text: "Account type updated! Refreshing...",
                });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to update account type");
            }
        } catch (err) {
            setMessage({
                type: "error",
                text: err instanceof Error ? err.message : "An error occurred",
            });
            await mutateSettings();
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
                await mutateSettings(
                    { ...settings, displayName: settings.displayName ?? "" },
                    { revalidate: false },
                );
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
            await mutateSettings();
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
                await mutateSettings(
                    { ...settings, companyName: settings.companyName ?? "" },
                    { revalidate: false },
                );
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
            await mutateSettings();
        } finally {
            setSavingCompanyName(false);
        }
    };

    return {
        savingDisplayName,
        savingCompanyName,
        savingRecruiter,
        message,
        setMessage,
        handleRecruiterToggle,
        handleSaveDisplayName,
        handleSaveCompanyName,
    };
}
