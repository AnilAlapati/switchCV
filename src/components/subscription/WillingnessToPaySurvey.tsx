"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db, analytics } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { X } from "lucide-react";

const SKIP_COOLDOWN_HOURS = 6;
const STORAGE_KEY = "willingnessToPay_lastSkipped";

export function WillingnessToPaySurvey() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkSurveyStatus() {
      if (!user) return;

      try {
        // Check if user has answered (Yes/No/Maybe) in Firestore
        const surveyDoc = await getDoc(
          doc(db, "users", user.uid, "surveys", "willingnessToPay")
        );

        if (surveyDoc.exists()) {
          const response = surveyDoc.data()?.response;
          // If they actually answered (not skipped), never show again
          if (response === "Yes" || response === "No" || response === "Maybe") {
            return;
          }
        }

        // Check localStorage for skip cooldown
        const lastSkipped = localStorage.getItem(STORAGE_KEY);
        if (lastSkipped) {
          const hoursSinceSkip =
            (Date.now() - parseInt(lastSkipped)) / (1000 * 60 * 60);
          if (hoursSinceSkip < SKIP_COOLDOWN_HOURS) {
            return; // Still in cooldown period
          }
        }

        // Show survey after a small delay for better UX
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
      } catch {
        // Silently fail - survey visibility is non-critical
      }
    }

    checkSurveyStatus();
  }, [user]);

  const handleResponse = async (response: "Yes" | "No" | "Maybe") => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Save actual answers to Firestore permanently
      await setDoc(doc(db, "users", user.uid, "surveys", "willingnessToPay"), {
        response,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        path: window.location.pathname,
      });

      // Log to Analytics
      if (analytics) {
        logEvent(analytics, "survey_response", {
          survey_id: "willingness_to_pay",
          answer: response,
        });
      }

      // Clear any skip timestamp
      localStorage.removeItem(STORAGE_KEY);

      setIsVisible(false);
    } catch {
      // Silently fail - survey response is non-critical
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Save skip timestamp to localStorage
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    // Log skip event to Analytics
    if (analytics) {
      logEvent(analytics, "survey_response", {
        survey_id: "willingness_to_pay",
        answer: "Skipped",
      });
    }

    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mb-12 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Writer Theme: White background with black border, editorial look */}
      <div className="relative bg-white border-2 border-black p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black transition-colors"
          aria-label="Skip survey"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-[1.5fr,2fr] gap-8 items-center">
          <div>
            <span className="inline-block px-3 py-1 mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-blue-600 bg-blue-100 border border-blue-200">
              Quick Question
            </span>
            <h3 className="text-xl font-serif font-bold text-black mb-2">
              Help us shape the future
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              If we introduced advanced premium features like bulk resume
              editing and unlimited AI analysis, would you be interested in
              subscribing?
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["Yes", "Maybe", "No"] as const).map((option) => (
              <button
                key={option}
                onClick={() => handleResponse(option)}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center p-4 border-2 border-black bg-white hover:bg-black hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
