"use client";

import React from "react";

/**
 * TemplateMiniPreview
 *
 * CSS-only fidelity previews for every resume template.
 * Each case mirrors the real renderer's visual language at ~100px scale.
 * Shown inside the TemplateGallery card before the user selects a template.
 */
export const TemplateMiniPreview: React.FC<{ templateId: string }> = ({
  templateId,
}) => {
  switch (templateId) {
    case "signal-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-[#F7F8F4] flex flex-col">
          <div className="bg-[#0D1F2D] px-3 py-2.5 flex flex-col gap-1">
            <div className="w-1/2 h-2 rounded-sm bg-[#1F9D8E]" />
            <div className="w-3/4 h-3 rounded-sm bg-white/80" />
            <div className="w-1/2 h-1.5 rounded-sm bg-[#7FBFB8]" />
          </div>
          <div className="flex flex-1 gap-2 px-3 py-2.5">
            <div className="flex-1 space-y-2">
              <div className="h-1.5 w-1/3 rounded-sm bg-[#1F9D8E]" />
              <div className="h-1.5 w-full rounded-sm bg-gray-200" />
              <div className="h-1.5 w-5/6 rounded-sm bg-gray-200" />
              <div className="mt-2 space-y-1.5">
                <div className="h-8 w-full rounded bg-white ring-1 ring-black/5" />
                <div className="h-8 w-full rounded bg-white ring-1 ring-black/5" />
              </div>
            </div>
            <div className="w-1/4 space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {["", "", "", ""].map((_, i) => (
                  <div
                    key={i}
                    className="h-2.5 w-7 rounded-full bg-[#FFF1EA]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case "standard-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-white flex flex-col px-3 py-3 gap-2">
          <div className="text-center space-y-1 pb-2 border-b border-gray-100">
            <div className="mx-auto w-2/3 h-3 rounded-sm bg-gray-800" />
            <div className="mx-auto w-1/2 h-1.5 rounded-sm bg-[#2563EB]" />
            <div className="mx-auto w-3/4 h-1 rounded-sm bg-gray-200 mt-1" />
          </div>
          {[1, 2, 3].map((s) => (
            <div key={s} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1/4 h-1.5 rounded-sm bg-[#2563EB]" />
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="h-1.5 w-full rounded-sm bg-gray-100" />
              <div className="h-1.5 w-5/6 rounded-sm bg-gray-100" />
            </div>
          ))}
        </div>
      );

    case "modern-creative-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-white flex">
          <div className="w-[38%] bg-gradient-to-b from-[#312E81] to-[#4F46E5] px-2 py-3 flex flex-col gap-2">
            <div className="w-full h-2.5 rounded-sm bg-white/80" />
            <div className="w-3/4 h-1.5 rounded-sm bg-indigo-200" />
            <div className="mt-1 space-y-1">
              <div className="w-2/3 h-1 rounded-sm bg-indigo-400" />
              <div className="w-full h-1.5 rounded-sm bg-white/20" />
              <div className="w-full h-1.5 rounded-sm bg-white/20" />
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {["", "", "", ""].map((_, i) => (
                <div key={i} className="h-2 w-6 rounded-full bg-white/20" />
              ))}
            </div>
          </div>
          <div className="flex-1 px-2 py-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1/4 h-1.5 rounded-sm bg-[#4F46E5]" />
              <div className="flex-1 h-px bg-indigo-50" />
            </div>
            <div className="border-l-2 border-indigo-100 pl-2 space-y-2">
              <div className="h-6 w-full rounded bg-gray-50" />
              <div className="h-6 w-full rounded bg-gray-50" />
            </div>
          </div>
        </div>
      );

    case "executive-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-white flex flex-col">
          <div className="bg-[#1A1A2E] text-center px-3 py-4 space-y-1">
            <div className="mx-auto w-2/3 h-3 rounded-sm bg-white/90" />
            <div className="mx-auto w-1/2 h-1.5 rounded-sm bg-[#B8860B]" />
            <div className="mx-auto w-1/4 h-px bg-[#B8860B]/60 mt-1" />
          </div>
          <div className="flex flex-1">
            <div className="flex-1 px-2.5 py-2 space-y-2">
              <div className="space-y-0.5">
                <div className="w-1/3 h-1.5 rounded-sm bg-gray-800" />
                <div className="w-6 h-0.5 rounded-full bg-[#B8860B]" />
              </div>
              <div className="h-1.5 w-full rounded-sm bg-gray-100" />
              <div className="h-1.5 w-5/6 rounded-sm bg-gray-100" />
              <div className="mt-1.5 space-y-1">
                <div className="h-5 w-full rounded bg-gray-50" />
                <div className="h-5 w-full rounded bg-gray-50" />
              </div>
            </div>
            <div className="w-[30%] bg-[#FDF6E3] border-l border-gray-100 px-1.5 py-2 space-y-2">
              <div className="w-2/3 h-1.5 rounded-sm bg-[#B8860B]" />
              {["", "", ""].map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#B8860B]" />
                  <div className="h-1.5 flex-1 rounded-sm bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "masonry-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-amber-50 flex flex-col gap-2 p-2">
          <div className="h-8 w-full rounded-md bg-amber-200" />
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            <div className="rounded-md bg-white shadow-sm" />
            <div className="rounded-md bg-amber-100 shadow-sm" />
            <div className="col-span-2 rounded-md bg-white shadow-sm h-10" />
          </div>
        </div>
      );

    case "atlas-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-white flex">
          <div className="w-[34%] bg-[#1B2A4A] px-2 py-3 space-y-2">
            <div className="w-full h-2.5 rounded-sm bg-white/80" />
            <div className="w-2/3 h-1.5 rounded-sm bg-[#7E9DCE]" />
            <div className="mt-2 space-y-1">
              <div className="w-1/2 h-1 rounded-sm bg-[#5B7DB1]" />
              <div className="w-full h-1.5 rounded-sm bg-white/15" />
              <div className="w-full h-1.5 rounded-sm bg-white/15" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {["", "", ""].map((_, i) => (
                <div key={i} className="h-2 w-7 rounded-sm bg-[#243660]" />
              ))}
            </div>
          </div>
          <div className="flex-1 px-2.5 py-3 space-y-2">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1/3 h-1.5 rounded-sm bg-[#1B2A4A]" />
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="h-1.5 w-full rounded-sm bg-gray-100" />
                <div className="h-1.5 w-5/6 rounded-sm bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      );

    case "clarity-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-white flex flex-col">
          <div className="h-1 bg-[#2563EB]" />
          <div className="px-3 py-2.5 space-y-1.5">
            <div className="w-2/3 h-3 rounded-sm bg-gray-900" />
            <div className="w-1/2 h-1.5 rounded-sm bg-[#2563EB]" />
            <div className="flex gap-3 pt-0.5">
              <div className="h-1 w-16 rounded-sm bg-gray-300" />
              <div className="h-1 w-14 rounded-sm bg-gray-300" />
            </div>
          </div>
          <div className="flex-1 px-3 py-1 space-y-2 border-t border-gray-100">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-1 rounded-full bg-[#2563EB]" />
                  <div className="w-1/4 h-1.5 rounded-sm bg-[#1D4ED8]" />
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="h-1.5 w-full rounded-sm bg-gray-100" />
                <div className="h-1.5 w-4/5 rounded-sm bg-gray-100" />
              </div>
            ))}
            <div className="flex flex-wrap gap-1 pt-1">
              {["", "", "", ""].map((_, i) => (
                <div
                  key={i}
                  className="h-2.5 w-8 rounded-full border border-blue-200 bg-blue-50"
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "velocity-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg flex flex-col">
          <div className="bg-[#0F172A] px-3 py-3 space-y-1">
            <div className="w-1/4 h-1 rounded-sm bg-[#22C55E]" />
            <div className="w-3/4 h-3 rounded-sm bg-white/80" />
            <div className="w-1/2 h-1.5 rounded-sm bg-slate-400" />
          </div>
          <div className="flex-1 bg-[#F8FAFC] px-3 py-2.5 space-y-2">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-1">
                <div
                  className="h-1.5 w-1/3"
                  style={{ borderLeft: "3px solid #22C55E", paddingLeft: 4 }}
                >
                  <div className="h-1.5 w-full rounded-sm bg-gray-800" />
                </div>
                <div className="h-1.5 w-full rounded-sm bg-gray-200" />
                <div className="h-1.5 w-4/5 rounded-sm bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      );

    case "narrative-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-[#FFFBF5] px-3 py-3 flex flex-col gap-2">
          <div className="text-center space-y-1">
            <div className="mx-auto w-2/3 h-3 rounded-sm bg-[#1C1917]" />
            <div className="mx-auto w-1/2 h-1.5 rounded-sm bg-amber-700" />
            <div className="mx-auto w-1/4 h-0.5 mt-1 rounded-full bg-amber-700/60" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="w-1/4 mx-auto h-1 rounded-sm bg-amber-700" />
            {[1, 2].map((s) => (
              <div
                key={s}
                className="border-b border-amber-100 pb-1.5 space-y-0.5"
              >
                <div className="flex justify-between">
                  <div className="h-1.5 w-1/3 rounded-sm bg-gray-800" />
                  <div className="h-1.5 w-1/5 rounded-sm bg-gray-400" />
                </div>
                <div className="h-1 w-full rounded-sm bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      );

    case "studio-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg flex flex-col">
          <div className="bg-[#7C3AED] px-3 py-4 relative overflow-hidden">
            <div className="absolute right-2 top-1 h-8 w-8 rounded-sm bg-[#A78BFA]/30" />
            <div className="w-2/3 h-3 rounded-sm bg-white/90" />
            <div className="mt-1 w-1/2 h-1.5 rounded-sm bg-violet-200" />
          </div>
          <div className="flex flex-1">
            <div className="w-[36%] bg-[#2E1065] px-2 py-2 space-y-1.5">
              <div className="w-2/3 h-1 rounded-sm bg-violet-400" />
              <div className="w-full h-1.5 rounded-sm bg-white/10" />
              <div className="w-full h-1.5 rounded-sm bg-white/10" />
              <div className="flex flex-wrap gap-1 mt-1">
                {["", ""].map((_, i) => (
                  <div key={i} className="h-2 w-8 rounded-full bg-[#4C1D95]" />
                ))}
              </div>
            </div>
            <div className="flex-1 px-2 py-2 space-y-1.5">
              <div className="w-1/4 h-1.5 rounded-sm bg-violet-600" />
              <div className="h-7 w-full rounded bg-gray-50" />
              <div className="h-7 w-full rounded bg-gray-50" />
            </div>
          </div>
        </div>
      );

    case "bento-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-[#F5F5F7] p-2 flex flex-col gap-1.5">
          <div className="h-10 rounded-xl bg-white shadow-sm flex items-center px-2.5 gap-2">
            <div className="h-2 w-1/3 rounded-sm bg-gray-800" />
            <div className="ml-auto h-1.5 w-1/4 rounded-sm bg-gray-300" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            <div className="col-span-2 rounded-xl bg-white shadow-sm" />
            <div className="rounded-xl bg-white shadow-sm" />
            <div className="rounded-xl bg-[#F0F0F5] shadow-sm" />
            <div className="col-span-2 rounded-xl bg-white shadow-sm" />
          </div>
        </div>
      );

    case "terminal-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-[#1E1E1E] flex flex-col">
          <div className="flex items-center gap-1.5 bg-[#2D2D2D] px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 px-3 py-2.5 space-y-1.5 font-mono">
            <div className="flex gap-2">
              <div className="h-1.5 w-3 rounded-sm bg-[#569CD6]" />
              <div className="h-1.5 w-1/2 rounded-sm bg-[#4EC9B0]" />
            </div>
            {[1, 2, 3].map((s) => (
              <div key={s} className="space-y-1 pl-3">
                <div className="h-1.5 w-2/3 rounded-sm bg-[#DCDCAA]" />
                <div className="h-1 w-full rounded-sm bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      );

    case "editorial-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-[#FAFAF8] flex flex-col">
          <div className="h-1 bg-gray-900" />
          <div className="px-3 py-3 border-b border-gray-200">
            <div className="w-3/4 h-4 rounded-sm bg-gray-900" />
            <div className="mt-1 w-1/3 h-1.5 rounded-sm bg-gray-400" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2 p-2.5">
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-sm bg-gray-200" />
              <div className="h-1.5 w-5/6 rounded-sm bg-gray-200" />
              <div className="h-1.5 w-4/5 rounded-sm bg-gray-200" />
            </div>
            <div className="border-l border-gray-200 pl-2 space-y-1.5">
              <div className="h-1.5 w-full rounded-sm bg-gray-200" />
              <div className="h-1.5 w-3/4 rounded-sm bg-gray-200" />
            </div>
          </div>
        </div>
      );

    case "noir-v1":
      return (
        <div className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-lg bg-black flex flex-col">
          <div className="px-3 py-4 border-b border-white/10">
            <div className="w-2/3 h-3 rounded-sm bg-white/90" />
            <div className="mt-1.5 w-1/3 h-0.5 rounded-full bg-white/30" />
          </div>
          <div className="flex-1 px-3 py-2.5 space-y-2">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-1">
                <div className="h-1.5 w-1/3 rounded-sm bg-white/50" />
                <div className="h-1.5 w-full rounded-sm bg-white/10" />
                <div className="h-1.5 w-4/5 rounded-sm bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="w-[85%] h-[85%] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
          <div className="h-10 bg-gray-50 border-b flex items-center px-3 gap-2">
            <div className="w-16 h-2 bg-gray-300 rounded" />
          </div>
          <div className="flex-1 p-3 space-y-2">
            <div className="w-full h-2 bg-gray-100 rounded" />
            <div className="w-3/4 h-2 bg-gray-100 rounded" />
          </div>
        </div>
      );
  }
};
