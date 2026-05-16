import React, { useState } from "react";
import Link from "next/link";
import { canAccessTemplate } from "@/lib/features/creativeTemplates";

// ─── Template data (colour swatches only – no heavy renderer imports) ────────
const TEMPLATES = [
  {
    id: "signal-v1",
    name: "Signal",
    tier: "free",
    preview: "bg-gradient-to-br from-teal-50 to-cyan-100",
  },
  {
    id: "standard-v1",
    name: "Standard",
    tier: "free",
    preview: "bg-gradient-to-br from-gray-50 to-gray-200",
  },
  {
    id: "modern-creative-v1",
    name: "Modern Creative",
    tier: "free",
    preview: "bg-gradient-to-br from-blue-50 to-indigo-100",
  },
  {
    id: "executive-v1",
    name: "Executive",
    tier: "free",
    preview: "bg-gradient-to-br from-slate-50 to-slate-200",
  },
  {
    id: "masonry-v1",
    name: "Masonry",
    tier: "free",
    preview: "bg-gradient-to-br from-amber-50 to-orange-100",
  },
  {
    id: "atlas-v1",
    name: "Atlas",
    tier: "free",
    preview: "bg-gradient-to-br from-emerald-50 to-green-100",
  },
  {
    id: "clarity-v1",
    name: "Clarity",
    tier: "free",
    preview: "bg-gradient-to-br from-violet-50 to-purple-100",
  },
  {
    id: "velocity-v1",
    name: "Velocity",
    tier: "premium",
    preview: "bg-gradient-to-br from-orange-50 to-red-100",
  },
  {
    id: "narrative-v1",
    name: "Narrative",
    tier: "premium",
    preview: "bg-gradient-to-br from-sky-50 to-blue-100",
  },
  {
    id: "studio-v1",
    name: "Studio",
    tier: "premium",
    preview: "bg-gradient-to-br from-yellow-50 to-amber-100",
  },
  {
    id: "bento-v1",
    name: "Bento",
    tier: "premium",
    preview: "bg-gradient-to-br from-[#F5F5F7] to-[#E8E8ED]",
  },
  {
    id: "terminal-v1",
    name: "Terminal",
    tier: "premium",
    preview: "bg-gradient-to-br from-[#1E1E1E] to-[#0D1117]",
  },
  {
    id: "editorial-v1",
    name: "Editorial",
    tier: "enterprise",
    preview: "bg-gradient-to-br from-[#FAFAF8] to-[#F0EDE8]",
  },
  { id: "noir-v1", name: "Noir", tier: "enterprise", preview: "bg-black" },
] as const;

const TIER_BADGE: Record<string, string> = {
  premium: "bg-gradient-to-r from-indigo-500 to-purple-500",
  enterprise: "bg-gradient-to-r from-amber-500 to-orange-500",
};

interface TemplatePickerPanelProps {
  userTier: "basic" | "premium" | "enterprise";
  currentTemplateId?: string | null;
  onApply: (templateId: string) => Promise<void>;
  isApplying: boolean;
}

export function TemplatePickerPanel({
  userTier,
  currentTemplateId,
  onApply,
  isApplying,
}: TemplatePickerPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
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
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-900">
            Change Design Template
          </span>
          {currentTemplateId && (
            <span className="text-[10px] px-2 py-0.5 border border-gray-200 bg-gray-100 text-gray-600 font-medium capitalize">
              {TEMPLATES.find((t) => t.id === currentTemplateId)?.name ??
                currentTemplateId}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Template Grid */}
      {open && (
        <div className="px-4 pb-4 pt-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {TEMPLATES.map((template) => {
              const canAccess = canAccessTemplate(template.id, userTier);
              const isSelected = currentTemplateId === template.id;

              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={!canAccess || isApplying}
                  onClick={() => canAccess && onApply(template.id)}
                  title={
                    canAccess ? template.name : `Requires ${template.tier} plan`
                  }
                  className={`relative group flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition-all
                    ${isSelected ? "ring-2 ring-black ring-offset-1 bg-gray-50" : "hover:bg-gray-50"}
                    ${!canAccess ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {/* Colour swatch */}
                  <div
                    className={`w-full aspect-[3/4] rounded-lg ${template.preview} relative overflow-hidden`}
                  >
                    {/* Lock icon for locked templates */}
                    {!canAccess && (
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
                    {/* Check for selected */}
                    {isSelected && (
                      <div className="absolute top-1 left-1 w-4 h-4 bg-black rounded-full flex items-center justify-center">
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
                    {template.tier !== "free" && (
                      <span
                        className={`absolute bottom-1 right-1 text-[8px] font-bold text-white px-1 py-0.5 rounded ${TIER_BADGE[template.tier]}`}
                      >
                        {template.tier === "premium" ? "PRO" : "ENT"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-tight font-medium truncate w-full text-gray-700">
                    {template.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-gray-400">
            Locked designs require a plan upgrade. Changes are saved instantly.
          </p>
        </div>
      )}
    </div>
  );
}

export function AIEditMissingIdView() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-gray-500">Resume ID is missing from the URL.</p>
    </div>
  );
}

export function AIEditLoadingView({ tier }: { tier: string | null }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">
          {tier === "basic" ? "Redirecting..." : "Loading editor…"}
        </p>
      </div>
    </div>
  );
}

export function ResumeMissingNotice() {
  return (
    <div className="border border-amber-200 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900 mb-1">No resume on file yet</p>
      <p className="text-sm text-amber-800 mb-3">
        You need an existing resume to use the AI editor. Start by creating one
        with the AI Resume Builder, then come back to refine it here.
      </p>
      <Link
        href="/create-resume"
        className="inline-flex items-center px-4 py-2 border-2 border-black bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
      >
        Launch AI Resume Builder
      </Link>
    </div>
  );
}
