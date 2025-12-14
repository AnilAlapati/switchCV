"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAuth, sendPasswordResetEmail, GoogleAuthProvider, linkWithPopup, unlink } from "firebase/auth";

export function SecuritySection() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleChangePassword = async () => {
        if (!user?.email) return;
        setLoading(true);
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, user.email);
            setMessage({ type: "success", text: "Password reset email sent! Check your inbox." });
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const providers = user?.providerData.map((p) => p.providerId) || [];
    const isGoogleLinked = providers.includes("google.com");
    const isEmailLinked = providers.includes("password");

    const toggleGoogleLink = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (isGoogleLinked) {
                await unlink(user, "google.com");
                setMessage({ type: "success", text: "Google account unlinked." });
            } else {
                const provider = new GoogleAuthProvider();
                await linkWithPopup(user, provider);
                setMessage({ type: "success", text: "Google account linked successfully." });
            }
        } catch (error: any) {
            setMessage({ type: "error", text: "Failed to update Google link: " + error.message });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2C4A3B] to-[#1A2F25] flex items-center justify-center shadow-lg shadow-[#2C4A3B]/20 text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1A2F25]">Security</h2>
                        <p className="text-[#1A2F25]/50 text-sm font-medium">
                            Manage your password and sign-in methods
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {isEmailLinked && (
                        <div className="flex items-center justify-between p-4 bg-[#F5F7F6] rounded-xl">
                            <div>
                                <h3 className="font-bold text-[#1A2F25]">Password</h3>
                                <p className="text-xs text-[#1A2F25]/60">Change your login password</p>
                            </div>
                            <button
                                onClick={handleChangePassword}
                                disabled={loading}
                                className="px-4 py-2 bg-white text-[#2C4A3B] text-sm font-bold rounded-lg border border-[#2C4A3B]/10 hover:bg-[#2C4A3B] hover:text-white transition-all disabled:opacity-50"
                            >
                                Reset Password
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-[#F5F7F6] rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-1.5">
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-full h-full" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#1A2F25]">Google</h3>
                                <p className="text-xs text-[#1A2F25]/60">{isGoogleLinked ? "Linked" : "Not linked"}</p>
                            </div>
                        </div>

                        {/* Only allow unlinking if there is another method (simplified check) */}
                        {(providers.length > 1 || !isGoogleLinked) && (
                            <button
                                onClick={toggleGoogleLink}
                                disabled={loading}
                                className="px-4 py-2 bg-white text-[#2C4A3B] text-sm font-bold rounded-lg border border-[#2C4A3B]/10 hover:bg-[#2C4A3B] hover:text-white transition-all disabled:opacity-50"
                            >
                                {isGoogleLinked ? "Unlink" : "Connect"}
                            </button>
                        )}
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.text}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
