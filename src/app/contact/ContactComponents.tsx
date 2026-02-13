import React from "react";
import Link from "next/link";
import { APP_CONFIG } from "@/config/constants";

export function ContactHeader() {
    return (
        <header className="mb-10 space-y-4">
            <p className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200">
                <span className="h-2 w-2 bg-blue-600" />{" "}
                Dedicated support
            </p>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-black sm:text-4xl text-wrap">
                Tell us what's working, what's not, or what you need next.
            </h1>
            <p className="text-base text-gray-600 font-sans">
                We read every message. Submissions route directly to{" "}
                <Link
                    href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
                    className="text-blue-600 underline underline-offset-4 hover:text-black"
                >
                    {APP_CONFIG.SUPPORT_EMAIL}
                </Link>{" "}
                so the team can jump in quickly.
            </p>
        </header>
    );
}

export function ContactSuccessView({ referenceId }: { referenceId: string }) {
    return (
        <div className="mb-8 border-2 border-blue-200 bg-blue-50 p-4 text-blue-900">
            <p className="font-bold text-blue-800">
                Thanks for the signal! Reference ID:{" "}
                <span className="font-mono">{referenceId}</span>
            </p>
            <p className="text-sm text-blue-800/80 font-sans">
                We replied via {APP_CONFIG.SUPPORT_EMAIL}. Keep this ID
                handy if you follow up.
            </p>
        </div>
    );
}

export function ContactErrorView({ error }: { error: string }) {
    return (
        <div className="mb-6 border-2 border-red-200 bg-red-50 p-4 text-red-900">
            <p className="font-bold">We couldn't send that.</p>
            <p className="text-sm opacity-80 font-sans">{error}</p>
        </div>
    );
}

export function ContactAside() {
    return (
        <aside className="space-y-6">
            <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
                <div className="border-2 border-gray-200 bg-gray-50 p-5 mb-4">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                        Direct inbox
                    </p>
                    <p className="mt-3 text-2xl font-serif font-bold text-black">
                        {APP_CONFIG.SUPPORT_EMAIL}
                    </p>
                    <p className="mt-2 text-sm text-gray-600 font-sans">
                        Mon–Fri · 9a–7p ET · Escalations routed instantly.
                    </p>
                </div>
                <div className="border-2 border-gray-200 bg-gray-50 p-5 mb-4">
                    <p className="text-sm font-bold text-black">What's next?</p>
                    <ul className="mt-3 space-y-3 text-sm text-gray-600 font-sans">
                        <li>• You receive a confirmation with your reference ID.</li>
                        <li>• An on-call teammate triages within a business day.</li>
                        <li>
                            • Urgent recruiter workflows alert the ops channel
                            immediately.
                        </li>
                    </ul>
                </div>
                <div className="border-2 border-gray-200 bg-gray-50 p-5 text-sm text-gray-600 font-sans">
                    <p className="font-bold text-black">Prefer async?</p>
                    <p className="mt-2">
                        Reply to the confirmation email with screenshots or Loom
                        links. The same reference ID threads everything together.
                    </p>
                </div>
            </div>
        </aside>
    );
}

export function HoneypotField({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <div
            className="absolute -left-[9999px] opacity-0"
            aria-hidden="true"
        >
            <label htmlFor="website_url">Website</label>
            <input
                type="text"
                id="website_url"
                name="website_url"
                tabIndex={-1}
                autoComplete="off"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
