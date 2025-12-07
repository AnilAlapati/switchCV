"use client";

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_URGENCY,
  type FeedbackCategory,
  type FeedbackUrgency,
} from "@/config/supportFeedback";
import { CATEGORY_HELP_TEXT } from "@/lib/contactPageHelpers";

interface FormFieldsProps {
  form: {
    name: string;
    email: string;
    category: FeedbackCategory;
    urgency: FeedbackUrgency;
    message: string;
    allowContact: boolean;
  };
  isSubmitting: boolean;
  onFieldChange: (field: string, value: string | boolean) => void;
}

export function ContactFormFields({
  form,
  isSubmitting,
  onFieldChange,
}: FormFieldsProps) {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-[#1A2F25]">
            Name (optional)
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="Casey, Hiring @ Switch"
            className="glass-input w-full rounded-2xl px-4 py-3 placeholder:text-[#2C4A3B]/40"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-[#1A2F25]">
            Email so we can follow up
          </label>
          <input
            type="email"
            value={form.email}
            required
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="you@company.com"
            className="glass-input w-full rounded-2xl px-4 py-3 placeholder:text-[#2C4A3B]/40"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-[#1A2F25]">
            Topic
          </label>
          <div className="rounded-2xl border border-[#2C4A3B]/20 bg-white/40">
            <select
              value={form.category}
              onChange={(e) => onFieldChange("category", e.target.value)}
              className="w-full rounded-2xl bg-transparent px-4 py-3 text-[#1A2F25] focus:outline-none"
              disabled={isSubmitting}
            >
              {FEEDBACK_CATEGORIES.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-[#1A2F25]"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-[#2C4A3B]/60 font-medium">
            {CATEGORY_HELP_TEXT[form.category]}
          </p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-[#1A2F25]">
            Urgency
          </label>
          <div className="flex gap-2 rounded-2xl border border-[#2C4A3B]/20 bg-white/40 p-1">
            {FEEDBACK_URGENCY.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFieldChange("urgency", opt.value)}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-bold transition-all ${form.urgency === opt.value
                    ? "bg-[#2C4A3B] text-white shadow-md"
                    : "text-[#2C4A3B]/60 hover:text-[#1A2F25]"
                  }`}
                disabled={isSubmitting}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-[#1A2F25]">
          What's happening?
        </label>
        <textarea
          value={form.message}
          required
          minLength={20}
          onChange={(e) => onFieldChange("message", e.target.value)}
          placeholder="Share as much context as you can. Screenshots, what you tried, or the goal you're chasing helps us act fast."
          className="glass-input min-h-[160px] w-full rounded-3xl px-4 py-3 placeholder:text-[#2C4A3B]/40"
          disabled={isSubmitting}
        />
      </div>

      <div className="rounded-2xl border border-[#2C4A3B]/20 bg-white/40 p-4">
        <label className="flex items-start gap-3 text-sm text-[#1A2F25] font-medium">
          <input
            type="checkbox"
            checked={form.allowContact}
            onChange={(e) => onFieldChange("allowContact", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[#2C4A3B]/40 text-[#2C4A3B] focus:ring-[#2C4A3B]"
            disabled={isSubmitting}
          />
          <span>
            It's okay to reach out with clarifying questions about this request.
            <span className="block text-xs text-[#2C4A3B]/60 mt-1">
              We only use your email for this thread. No marketing lists.
            </span>
          </span>
        </label>
      </div>
    </>
  );
}
