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
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Name (optional)
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="Casey, Hiring @ Switch"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Email so we can follow up
          </label>
          <input
            type="email"
            value={form.email}
            required
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Topic
          </label>
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <select
              value={form.category}
              onChange={(e) => onFieldChange("category", e.target.value)}
              className="w-full rounded-2xl bg-transparent px-4 py-3 text-white focus:outline-none"
              disabled={isSubmitting}
            >
              {FEEDBACK_CATEGORIES.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-slate-900 text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {CATEGORY_HELP_TEXT[form.category]}
          </p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Urgency
          </label>
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            {FEEDBACK_URGENCY.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFieldChange("urgency", opt.value)}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${
                  form.urgency === opt.value
                    ? "bg-cyan-500/90 text-slate-950 shadow-lg shadow-cyan-500/40"
                    : "text-slate-300"
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
        <label className="mb-2 block text-sm font-medium text-slate-200">
          What's happening?
        </label>
        <textarea
          value={form.message}
          required
          minLength={20}
          onChange={(e) => onFieldChange("message", e.target.value)}
          placeholder="Share as much context as you can. Screenshots, what you tried, or the goal you're chasing helps us act fast."
          className="min-h-[160px] w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
          disabled={isSubmitting}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="flex items-start gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={form.allowContact}
            onChange={(e) => onFieldChange("allowContact", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-400 text-cyan-400 focus:ring-cyan-400"
            disabled={isSubmitting}
          />
          <span>
            It's okay to reach out with clarifying questions about this request.
            <span className="block text-xs text-slate-400">
              We only use your email for this thread. No marketing lists.
            </span>
          </span>
        </label>
      </div>
    </>
  );
}
