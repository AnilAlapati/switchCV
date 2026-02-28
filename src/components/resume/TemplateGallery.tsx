"use client";

import React, { useState } from "react";
import {
  CREATIVE_TEMPLATES_ENABLED,
  canAccessTemplate,
  getUpgradeMessage,
  PREMIUM_TEMPLATE_INFO,
  TemplateTier,
} from "@/lib/features/creativeTemplates";

interface TemplateGalleryProps {
  userTier: "basic" | "premium" | "enterprise";
  currentTemplateId?: string;
  onSelectTemplate: (templateId: string) => void;
  onUpgrade?: (tier: TemplateTier) => void;
}

interface TemplateCardData {
  id: string;
  name: string;
  description: string;
  tier: TemplateTier;
  preview: string;
}

const ALL_TEMPLATES: TemplateCardData[] = [
  // Free Templates
  {
    id: "signal-v1",
    name: "Signal",
    description: "Engineering-first launch template",
    tier: "free",
    preview: "bg-gradient-to-br from-teal-50 to-cyan-100",
  },
  {
    id: "standard-v1",
    name: "Standard Professional",
    description: "Clean, professional design for any industry",
    tier: "free",
    preview: "bg-gradient-to-br from-gray-50 to-gray-100",
  },
  {
    id: "modern-creative-v1",
    name: "Modern Creative",
    description: "Contemporary layout with creative flair",
    tier: "free",
    preview: "bg-gradient-to-br from-blue-50 to-indigo-100",
  },
  {
    id: "executive-v1",
    name: "Executive",
    description: "Polished design for senior professionals",
    tier: "free",
    preview: "bg-gradient-to-br from-slate-50 to-slate-200",
  },
  {
    id: "masonry-v1",
    name: "Masonry Portfolio",
    description: "Grid layout perfect for showcasing work",
    tier: "free",
    preview: "bg-gradient-to-br from-amber-50 to-orange-100",
  },
  // Premium Templates
  {
    id: "narrative-v1",
    name: "Narrative",
    description: "Leadership and product career arc storytelling",
    tier: "premium",
    preview: "bg-gradient-to-br from-sky-50 to-blue-100",
  },
  {
    id: "studio-v1",
    name: "Studio",
    description: "Creative editorial layout with project spotlight",
    tier: "premium",
    preview: "bg-gradient-to-br from-amber-50 to-orange-100",
  },
  {
    id: "bento-v1",
    name: "Bento",
    description: "Apple-inspired modular grid layout",
    tier: "premium",
    preview: "bg-gradient-to-br from-[#F5F5F7] to-[#E8E8ED]",
  },
  {
    id: "terminal-v1",
    name: "Terminal",
    description: "VS Code-inspired developer theme",
    tier: "premium",
    preview: "bg-gradient-to-br from-[#1E1E1E] to-[#0D1117]",
  },
  // Enterprise Templates
  {
    id: "editorial-v1",
    name: "Editorial",
    description: "Magazine-style typography",
    tier: "enterprise",
    preview: "bg-gradient-to-br from-[#FAFAF8] to-[#F0EDE8]",
  },
  {
    id: "noir-v1",
    name: "Noir",
    description: "Dark luxury aesthetic",
    tier: "enterprise",
    preview: "bg-black",
  },
];

const TierBadge: React.FC<{ tier: TemplateTier }> = ({ tier }) => {
  if (tier === "free") return null;

  const colors = {
    premium: "bg-gradient-to-r from-indigo-500 to-purple-500",
    enterprise: "bg-gradient-to-r from-amber-500 to-orange-500",
  };

  return (
    <span
      className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium text-white rounded-full ${colors[tier]}`}
    >
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
};

const LockOverlay: React.FC<{
  message: string;
  tier: TemplateTier;
  onUpgrade?: (tier: TemplateTier) => void;
}> = ({ message, tier, onUpgrade }) => (
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
    <svg
      className="w-8 h-8 text-white/80 mb-2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
    <p className="text-white/90 text-sm font-medium text-center px-4 mb-3">
      {message}
    </p>
    {onUpgrade && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpgrade(tier);
        }}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-100 transition-colors"
      >
        Upgrade Now
      </button>
    )}
  </div>
);

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  userTier,
  currentTemplateId,
  onSelectTemplate,
  onUpgrade,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter templates based on feature flag
  const templates = CREATIVE_TEMPLATES_ENABLED
    ? ALL_TEMPLATES
    : ALL_TEMPLATES.filter((t) => t.tier === "free");

  const handleSelect = (templateId: string) => {
    if (canAccessTemplate(templateId, userTier)) {
      onSelectTemplate(templateId);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Template
        </h2>
        <p className="text-gray-600">
          Select a template that best represents your professional brand
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((template) => {
          const canAccess = canAccessTemplate(template.id, userTier);
          const isSelected = currentTemplateId === template.id;
          const upgradeInfo = getUpgradeMessage(template.id);
          const premiumInfo = PREMIUM_TEMPLATE_INFO[template.id];

          return (
            <div
              key={template.id}
              className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected
                  ? "ring-2 ring-indigo-500 ring-offset-2"
                  : "hover:shadow-xl"
              } ${!canAccess ? "cursor-not-allowed" : ""}`}
              onClick={() => handleSelect(template.id)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Preview Area */}
              <div
                className={`aspect-[3/4] ${template.preview} relative flex items-center justify-center`}
              >
                {/* Template Preview Mockup */}
                <div className="w-[85%] h-[85%] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                  {/* Header mock */}
                  <div className="h-12 bg-gray-50 border-b flex items-center px-3">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mr-2" />
                    <div className="w-20 h-2 bg-gray-200 rounded" />
                  </div>
                  {/* Content mock */}
                  <div className="flex-1 p-3 space-y-2">
                    <div className="w-full h-3 bg-gray-100 rounded" />
                    <div className="w-3/4 h-3 bg-gray-100 rounded" />
                    <div className="w-1/2 h-3 bg-gray-100 rounded" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-8 bg-gray-50 rounded" />
                      <div className="h-8 bg-gray-50 rounded" />
                    </div>
                  </div>
                </div>

                {/* Tier Badge */}
                <TierBadge tier={template.tier} />

                {/* Lock Overlay for inaccessible templates */}
                {!canAccess && upgradeInfo && (
                  <LockOverlay
                    message={upgradeInfo.message}
                    tier={upgradeInfo.tier}
                    onUpgrade={onUpgrade}
                  />
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 left-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info Area */}
              <div className="p-4 bg-white border-t">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {premiumInfo?.tagline || template.description}
                </p>

                {/* Best For Tags */}
                {premiumInfo?.bestFor && hoveredId === template.id && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {premiumInfo.bestFor.map((role, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Flag Disabled Notice */}
      {!CREATIVE_TEMPLATES_ENABLED && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Premium templates are currently disabled.
            Enable them by setting{" "}
            <code className="bg-amber-100 px-1 rounded">
              NEXT_PUBLIC_CREATIVE_TEMPLATES_ENABLED=true
            </code>{" "}
            in your environment.
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;
