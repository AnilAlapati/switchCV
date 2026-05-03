"use client";

import { useState, useCallback } from "react";
import { canAccessTemplate } from "@/lib/features/creativeTemplates";

type Tier = "basic" | "premium" | "enterprise";

const TEMPLATES = [
  {
    id: "signal-v1",
    name: "Signal",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-teal-50 to-cyan-100",
  },
  {
    id: "standard-v1",
    name: "Standard",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-gray-50 to-gray-200",
  },
  {
    id: "modern-creative-v1",
    name: "Modern Creative",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-blue-50 to-indigo-100",
  },
  {
    id: "executive-v1",
    name: "Executive",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-slate-50 to-slate-200",
  },
  {
    id: "masonry-v1",
    name: "Masonry",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-amber-50 to-orange-100",
  },
  {
    id: "atlas-v1",
    name: "Atlas",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-emerald-50 to-green-100",
  },
  {
    id: "clarity-v1",
    name: "Clarity",
    tier: "free" as const,
    preview: "bg-gradient-to-br from-violet-50 to-purple-100",
  },
  {
    id: "narrative-v1",
    name: "Narrative",
    tier: "premium" as const,
    preview: "bg-gradient-to-br from-sky-50 to-blue-100",
  },
  {
    id: "studio-v1",
    name: "Studio",
    tier: "premium" as const,
    preview: "bg-gradient-to-br from-yellow-50 to-amber-100",
  },
  {
    id: "bento-v1",
    name: "Bento",
    tier: "premium" as const,
    preview: "bg-gradient-to-br from-[#F5F5F7] to-[#E8E8ED]",
  },
  {
    id: "terminal-v1",
    name: "Terminal",
    tier: "premium" as const,
    preview: "bg-gradient-to-br from-[#1E1E1E] to-[#0D1117]",
  },
  {
    id: "velocity-v1",
    name: "Velocity",
    tier: "premium" as const,
    preview: "bg-gradient-to-br from-orange-50 to-red-100",
  },
  {
    id: "editorial-v1",
    name: "Editorial",
    tier: "enterprise" as const,
    preview: "bg-gradient-to-br from-[#FAFAF8] to-[#F0EDE8]",
  },
  {
    id: "noir-v1",
    name: "Noir",
    tier: "enterprise" as const,
    preview: "bg-black",
  },
] as const;

const TIER_BADGE: Record<string, string> = {
  premium: "bg-gradient-to-r from-indigo-500 to-purple-500",
  enterprise: "bg-gradient-to-r from-amber-500 to-orange-500",
};

interface TemplateBarProps {
  userTier: Tier;
  savedTemplateId: string;
  previewTemplateId: string | null;
  onPreview: (id: string) => void;
  onApply: () => Promise<void>;
  onClose: () => void;
  isApplying: boolean;
}

export function TemplateBar({
  userTier,
  savedTemplateId,
  previewTemplateId,
  onPreview,
  onApply,
  onClose,
  isApplying,
}: TemplateBarProps) {
  const [open, setOpen] = useState(false);

  const effectiveId = previewTemplateId ?? savedTemplateId;
  const hasUnsavedChange =
    previewTemplateId !== null && previewTemplateId !== savedTemplateId;

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose();
  }, [onClose]);

  return (
    <div
      className="fixed top-20 right-6 z-50 flex flex-col items-end pointer-events-none print:hidden"
    >
      {/* ── Expanded Tray ── */}
      {open && (
        <div className="pointer-events-auto w-full max-w-sm mr-0 mb-3">
          <div className="bg-white/96 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.486M7 17h.01"
                  />
                </svg>
                <span className="text-sm font-semibold text-gray-800">
                  Choose a Design
                </span>
                {previewTemplateId && previewTemplateId !== savedTemplateId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    Preview
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close design picker"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Template Grid Container */}
            <div className="p-4 border-b border-gray-100">
              <div 
                className="grid grid-cols-4 gap-2"
                role="listbox"
                aria-label="Template designs"
              >
                {TEMPLATES.map((t) => {
                  const accessible = canAccessTemplate(t.id, userTier);
                  const isSelected = effectiveId === t.id;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={!accessible || isApplying}
                      onClick={() => accessible && onPreview(t.id)}
                      title={accessible ? t.name : `Requires ${t.tier} plan`}
                      className={[
                        "flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all text-center",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                        isSelected
                          ? "ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50"
                          : accessible
                            ? "hover:bg-gray-50 cursor-pointer"
                            : "opacity-50 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {/* Colour swatch */}
                      <div
                        className={`w-full aspect-[3/4] rounded-lg ${t.preview} relative overflow-hidden`}
                      >
                        {/* Lock */}
                        {!accessible && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <svg
                              className="w-3.5 h-3.5 text-white drop-shadow"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                        )}
                        {/* Checkmark */}
                        {isSelected && (
                          <div className="absolute top-1 left-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                        {/* Tier badge */}
                        {t.tier !== "free" && (
                          <span
                            className={`absolute bottom-1 right-1 text-[7px] font-bold text-white px-1 py-0.5 rounded ${TIER_BADGE[t.tier]}`}
                          >
                            {t.tier === "premium" ? "PRO" : "ENT"}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] leading-tight font-medium text-gray-700 text-center w-full truncate">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
              <p className="text-[11px] text-gray-400">
                {hasUnsavedChange
                  ? "You're previewing a design — click Apply to save it."
                  : "Click any design to preview it live on your resume."}
              </p>
              <div className="flex items-center gap-2">
                {hasUnsavedChange && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {hasUnsavedChange && (
                  <button
                    type="button"
                    onClick={onApply}
                    disabled={isApplying}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {isApplying ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          role="status"
                          aria-live="polite"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                          />
                        </svg>
                        Saving…
                      </>
                    ) : (
                      "Apply Design"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toggle Pill ── */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close design picker" : "Change resume design"}
        aria-expanded={open}
        className={[
          "pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg border text-sm font-medium transition-all",
          open
            ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-200/50"
            : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-indigo-100/50 shadow-gray-200/60",
        ].join(" ")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.486M7 17h.01"
          />
        </svg>
        Change Design
        {hasUnsavedChange && (
          <span
            className="w-2 h-2 rounded-full bg-amber-400"
            aria-label="Unsaved preview active"
          />
        )}
      </button>
    </div>
  );
}
