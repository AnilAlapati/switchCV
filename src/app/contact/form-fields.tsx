"use client";

import type { ReactElement } from "react";
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
}: FormFieldsProps): ReactElement {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
            Name (optional)
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="Casey, Hiring @ Switch"
            className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-black placeholder:text-gray-400 focus:border-black transition-colors"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
            Email so we can follow up
          </label>
          <input
            type="email"
            value={form.email}
            required
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-white border-2 border-gray-200 px-4 py-3 text-black placeholder:text-gray-400 focus:border-black transition-colors"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
            Topic
          </label>
          <div className="border-2 border-gray-200 bg-white">
            <select
              value={form.category}
              onChange={(e) => onFieldChange("category", e.target.value)}
              className="w-full bg-transparent px-4 py-3 text-black focus:outline-none"
              disabled={isSubmitting}
            >
              {FEEDBACK_CATEGORIES.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-black"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-500 font-sans">
            {CATEGORY_HELP_TEXT[form.category]}
          </p>
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
            Urgency
          </label>
          <div className="flex gap-1 border-2 border-gray-200 bg-gray-50 p-1">
            {FEEDBACK_URGENCY.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFieldChange("urgency", opt.value)}
                className={`flex-1 px-3 py-2 text-sm font-bold transition-all ${form.urgency === opt.value
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black hover:bg-white"
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
        <label className="mb-2 block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
          What's happening?
        </label>
        <textarea
          value={form.message}
          required
          minLength={20}
          onChange={(e) => onFieldChange("message", e.target.value)}
          placeholder="Share as much context as you can. Screenshots, what you tried, or the goal you're chasing helps us act fast."
          className="min-h-[160px] w-full bg-white border-2 border-gray-200 px-4 py-3 text-black placeholder:text-gray-400 focus:border-black transition-colors"
          disabled={isSubmitting}
        />
      </div>

      <div className="border-2 border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-3 text-sm text-black font-medium">
          <input
            type="checkbox"
            checked={form.allowContact}
            onChange={(e) => onFieldChange("allowContact", e.target.checked)}
            className="mt-1 h-4 w-4 border-2 border-gray-300 text-black focus:ring-black"
            disabled={isSubmitting}
          />
          <span>
            It's okay to reach out with clarifying questions about this request.
            <span className="block text-xs text-gray-500 mt-1 font-sans">
              We only use your email for this thread. No marketing lists.
            </span>
          </span>
        </label>
      </div>
    </>
  );
}
