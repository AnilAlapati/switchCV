"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { APP_CONFIG } from "@/config/constants";
import {
  type FeedbackCategory,
  type FeedbackUrgency,
} from "@/config/supportFeedback";
import { useAuth } from "@/hooks/useAuth";
import { ContactFormFields } from "./form-fields";
import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";

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

// Bot protection constants
const MIN_FORM_TIME_MS = 3000; // Minimum 3 seconds to fill form (bots are instant)
const SUBMISSION_COOLDOWN_MS = 30000; // 30 seconds between submissions

const getInitialFormState = (): FormState => ({
  name: "",
  email: "",
  category: "bug",
  urgency: "normal",
  message: "",
  allowContact: true,
  pageContext: "/contact",
});

export default function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(getInitialFormState());
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  // Bot protection state
  const [honeypot, setHoneypot] = useState(""); // Hidden field - bots will fill this
  const formLoadTime = useRef<number>(Date.now());
  const lastSubmissionTime = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setForm((prev) => ({ ...prev, pageContext: window.location.href }));
      // Reset form load time when component mounts
      formLoadTime.current = Date.now();
    }
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setForm(getInitialFormState());
    setHoneypot("");
    formLoadTime.current = Date.now();
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

    // Bot protection checks
    const now = Date.now();

    // Check 1: Honeypot field should be empty (bots auto-fill hidden fields)
    if (honeypot) {
      // Silently reject - don't give feedback to bots
      setStatus("success");
      setReferenceId("FB-SUBMITTED");
      return;
    }

    // Check 2: Form filled too quickly (< 3 seconds is suspicious)
    const timeSinceLoad = now - formLoadTime.current;
    if (timeSinceLoad < MIN_FORM_TIME_MS) {
      setError(
        "Please take a moment to review your message before submitting."
      );
      setStatus("error");
      return;
    }

    // Check 3: Submission cooldown (prevent rapid resubmissions)
    const timeSinceLastSubmit = now - lastSubmissionTime.current;
    if (
      lastSubmissionTime.current > 0 &&
      timeSinceLastSubmit < SUBMISSION_COOLDOWN_MS
    ) {
      const waitSeconds = Math.ceil(
        (SUBMISSION_COOLDOWN_MS - timeSinceLastSubmit) / 1000
      );
      setError(`Please wait ${waitSeconds} seconds before submitting again.`);
      setStatus("error");
      return;
    }

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
        body: JSON.stringify({
          ...form,
          // Include bot protection metadata for server-side validation
          _formTime: timeSinceLoad,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send feedback");
      }

      // Record successful submission time
      lastSubmissionTime.current = Date.now();

      setReferenceId(data.referenceId);
      setStatus("success");

      // Clear the form after successful submission
      resetForm();
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
    <div className="min-h-screen text-[#1A2F25] relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <BackgroundBlobs />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 lg:px-8 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1.2fr,0.8fr]">
          <section className="glass-panel p-6 sm:p-10">
            <header className="mb-10 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#2C4A3B]/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#2C4A3B]">
                <span className="h-2 w-2 rounded-full bg-[#2C4A3B]" />{" "}
                Dedicated support
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A2F25] sm:text-4xl text-wrap">
                Tell us what's working, what's not, or what you need next.
              </h1>
              <p className="text-base text-[#1A2F25]/70">
                We read every message. Submissions route directly to{" "}
                <Link
                  href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
                  className="text-[#2C4A3B] underline underline-offset-4 hover:text-[#1A2F25]"
                >
                  {APP_CONFIG.SUPPORT_EMAIL}
                </Link>{" "}
                so the team can jump in quickly.
              </p>
            </header>

            {showSuccess && referenceId && (
              <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-emerald-900">
                <p className="font-bold text-emerald-800">
                  Thanks for the signal! Reference ID:{" "}
                  <span className="font-mono">{referenceId}</span>
                </p>
                <p className="text-sm text-emerald-800/80">
                  We replied via {APP_CONFIG.SUPPORT_EMAIL}. Keep this ID
                  handy if you follow up.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-rose-900">
                <p className="font-bold">We couldn't send that.</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Honeypot field - hidden from real users, bots will fill it */}
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
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <ContactFormFields
                form={form}
                isSubmitting={isSubmitting}
                onFieldChange={(f: string, v: string | boolean) =>
                  handleChange(f as keyof FormState, v)
                }
              />
              <div className="flex flex-col gap-4 text-sm text-[#1A2F25]/60 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Avg. weekday response time:{" "}
                  <span className="text-[#1A2F25] font-semibold">&lt; 12 hrs</span>
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button inline-flex items-center justify-center rounded-2xl bg-[#2C4A3B] px-6 py-3 text-base font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[#1A2F25] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Send feedback"}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="glass-panel p-6">
              <div className="rounded-2xl border border-[#2C4A3B]/10 bg-white/40 p-5 mb-4">
                <p className="text-sm uppercase tracking-[0.3em] text-[#2C4A3B]/60 font-bold">
                  Direct inbox
                </p>
                <p className="mt-3 text-2xl font-bold text-[#1A2F25]">
                  {APP_CONFIG.SUPPORT_EMAIL}
                </p>
                <p className="mt-2 text-sm text-[#1A2F25]/70">
                  Mon–Fri · 9a–7p ET · Escalations routed instantly.
                </p>
              </div>
              <div className="rounded-2xl border border-[#2C4A3B]/10 bg-white/40 p-5 mb-4">
                <p className="text-sm font-bold text-[#1A2F25]">What's next?</p>
                <ul className="mt-3 space-y-3 text-sm text-[#1A2F25]/70">
                  <li>• You receive a confirmation with your reference ID.</li>
                  <li>• An on-call teammate triages within a business day.</li>
                  <li>
                    • Urgent recruiter workflows alert the ops channel
                    immediately.
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[#2C4A3B]/10 bg-white/40 p-5 text-sm text-[#1A2F25]/70">
                <p className="font-bold text-[#1A2F25]">Prefer async?</p>
                <p className="mt-2">
                  Reply to the confirmation email with screenshots or Loom
                  links. The same reference ID threads everything together.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
