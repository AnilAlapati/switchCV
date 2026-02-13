"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  type FeedbackCategory,
  type FeedbackUrgency,
} from "@/config/supportFeedback";
import { useAuth } from "@/hooks/useAuth";
import { ContactFormFields } from "./form-fields";
// import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs"; // Removed in favor of DashboardBackground
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useRouter } from "next/navigation";

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

import {
  ContactHeader,
  ContactSuccessView,
  ContactErrorView,
  ContactAside,
  HoneypotField,
} from "./ContactComponents";

export default function ContactPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
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
    <DashboardBackground>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={async () => {
          await logout();
          router.push("/auth");
        }}
      />
      <div className="min-h-screen text-[#1A2F25] relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-6xl px-4 lg:px-8 py-24 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-[1.2fr,0.8fr]">
            <section className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-10">
              <ContactHeader />

              {showSuccess && referenceId && (
                <ContactSuccessView referenceId={referenceId} />
              )}

              {error && (
                <ContactErrorView error={error} />
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <HoneypotField value={honeypot} onChange={setHoneypot} />

                <ContactFormFields
                  form={form}
                  isSubmitting={isSubmitting}
                  onFieldChange={(f: string, v: string | boolean) =>
                    handleChange(f as keyof FormState, v)
                  }
                />
                <div className="flex flex-col gap-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-sans">
                    Avg. weekday response time:{" "}
                    <span className="text-black font-bold">&lt; 12 hrs</span>
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center bg-black px-6 py-3 text-base font-bold text-white border-2 border-black transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Sending..." : "Send feedback"}
                  </button>
                </div>
              </form>
            </section>

            <ContactAside />
          </div>
        </div>
      </div>
    </DashboardBackground>
  );
}

