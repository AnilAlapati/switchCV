"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_CONFIG } from "@/config/constants";
import {
  type FeedbackCategory,
  type FeedbackUrgency,
} from "@/config/supportFeedback";
import { useAuth } from "@/hooks/useAuth";
import { ContactFormFields } from "./form-fields";

interface FormState {
  name: string;
  email: string;
  category: FeedbackCategory;
  urgency: FeedbackUrgency;
  message: string;
  allowContact: boolean;
  pageContext: string;
}

type SubmissionState = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    category: "bug",
    urgency: "normal",
    message: "",
    allowContact: true,
    pageContext: "/contact",
  });
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setForm((prev) => ({ ...prev, pageContext: window.location.href }));
    }
  }, []);

  const isSubmitting = status === "submitting";
  const showSuccess = status === "success" && referenceId;

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof value === "string" ? value : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setStatus("submitting");
    setError(null);
    setReferenceId(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // If user is logged in, attach auth token for user context
      if (user) {
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/contact/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send feedback");
      }

      setReferenceId(data.referenceId);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We couldn't send your message. Please try again.";
      setError(message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-purple-500/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.2fr,0.8fr]">
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-cyan-500/10 sm:p-10">
              <header className="mb-10 space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300/80">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />{" "}
                  Dedicated support
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Tell us what's working, what's not, or what you need next.
                </h1>
                <p className="text-base text-slate-300">
                  We read every message. Submissions route directly to{" "}
                  <Link
                    href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
                    className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
                  >
                    {APP_CONFIG.SUPPORT_EMAIL}
                  </Link>{" "}
                  so the team can jump in quickly.
                </p>
              </header>

              {showSuccess && referenceId && (
                <div className="mb-8 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-emerald-100">
                  <p className="font-semibold text-emerald-200">
                    Thanks for the signal! Reference ID:{" "}
                    <span className="font-mono">{referenceId}</span>
                  </p>
                  <p className="text-sm text-emerald-100/80">
                    We replied via {APP_CONFIG.SUPPORT_EMAIL}. Keep this ID
                    handy if you follow up.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">
                  <p className="font-semibold">We couldn't send that.</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <ContactFormFields form={form} isSubmitting={isSubmitting} onFieldChange={(f: string, v: string | boolean) => handleChange(f as keyof FormState, v)} />
                <div className="flex flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <p>Avg. weekday response time: <span className="text-white">&lt; 12 hrs</span></p>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition-transform hover:-translate-y-0.5 hover:shadow-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSubmitting ? "Sending..." : "Send feedback"}
                  </button>
                </div>
              </form>
            </section>

            <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5/60 p-6 backdrop-blur-lg">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                  Direct inbox
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {APP_CONFIG.SUPPORT_EMAIL}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Mon–Fri · 9a–7p ET · Escalations routed instantly.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
                <p className="text-sm font-semibold text-white">What's next?</p>
                <ul className="mt-3 space-y-3 text-sm text-slate-300">
                  <li>• You receive a confirmation with your reference ID.</li>
                  <li>• An on-call teammate triages within a business day.</li>
                  <li>
                    • Urgent recruiter workflows alert the ops channel
                    immediately.
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-sm text-slate-300">
                <p className="font-semibold text-white">Prefer async?</p>
                <p className="mt-2">
                  Reply to the confirmation email with screenshots or Loom
                  links. The same reference ID threads everything together.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
