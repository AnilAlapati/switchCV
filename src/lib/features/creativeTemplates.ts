/**
 * Creative Templates Feature Flag
 *
 * Master flag to enable/disable all creative template features:
 * - Premium templates (Bento, Terminal, Editorial, Noir)
 * - Template gallery/preview UI
 * - Tier enforcement for template access
 *
 * Set NEXT_PUBLIC_CREATIVE_TEMPLATES_ENABLED=false to revert to basic templates only
 */

export const CREATIVE_TEMPLATES_ENABLED =
  process.env.NEXT_PUBLIC_CREATIVE_TEMPLATES_ENABLED !== "false";

/**
 * Template tier definitions
 */
export type TemplateTier = "free" | "premium" | "enterprise";

export interface TemplateTierConfig {
  id: string;
  tier: TemplateTier;
  name: string;
  description: string;
}

/**
 * Template access by tier
 */
export const TEMPLATE_TIERS: Record<string, TemplateTier> = {
  // Free templates - available to all users
  "signal-v1": "free",
  "standard-v1": "free",
  "modern-creative-v1": "free",
  "executive-v1": "free",
  "masonry-v1": "free",
  "atlas-v1": "free",
  "clarity-v1": "free",
  // Premium templates - require premium subscription
  "velocity-v1": "premium",
  "narrative-v1": "premium",
  "studio-v1": "premium",
  "bento-v1": "premium",
  "terminal-v1": "premium",
  // Enterprise templates - require enterprise subscription
  "editorial-v1": "enterprise",
  "noir-v1": "enterprise",
};

/**
 * Get templates available for a subscription tier
 */
export const getAvailableTemplates = (
  userTier: "basic" | "premium" | "enterprise",
): string[] => {
  if (!CREATIVE_TEMPLATES_ENABLED) {
    // Feature disabled - only return basic templates
    return ["signal-v1", "standard-v1", "modern-creative-v1", "executive-v1"];
  }

  const tierHierarchy = {
    basic: ["free"],
    premium: ["free", "premium"],
    enterprise: ["free", "premium", "enterprise"],
  };

  const allowedTiers = tierHierarchy[userTier];

  return Object.entries(TEMPLATE_TIERS)
    .filter(([, tier]) => allowedTiers.includes(tier))
    .map(([id]) => id);
};

/**
 * Check if user can access a specific template
 */
export const canAccessTemplate = (
  templateId: string,
  userTier: "basic" | "premium" | "enterprise",
): boolean => {
  if (!CREATIVE_TEMPLATES_ENABLED) {
    // Feature disabled - free templates are still accessible to everyone
    return (TEMPLATE_TIERS[templateId] ?? "free") === "free";
  }

  const templateTier = TEMPLATE_TIERS[templateId] || "free";

  if (templateTier === "free") return true;
  if (templateTier === "premium")
    return userTier === "premium" || userTier === "enterprise";
  if (templateTier === "enterprise") return userTier === "enterprise";

  return false;
};

/**
 * Get upgrade message for locked template
 */
export const getUpgradeMessage = (
  templateId: string,
): { tier: TemplateTier; message: string } | null => {
  const templateTier = TEMPLATE_TIERS[templateId];

  if (templateTier === "premium") {
    return {
      tier: "premium",
      message: "Upgrade to Premium to unlock this template",
    };
  }

  if (templateTier === "enterprise") {
    return {
      tier: "enterprise",
      message: "Upgrade to Enterprise to unlock this template",
    };
  }

  return null;
};

/**
 * Premium template metadata for gallery display
 */
export const PREMIUM_TEMPLATE_INFO: Record<
  string,
  {
    tagline: string;
    preview: string;
    bestFor: string[];
    color: string;
  }
> = {
  "narrative-v1": {
    tagline: "Career arc storytelling for leadership and product roles",
    preview: "Outcome-led sections with strong progression cues",
    bestFor: ["Product Leaders", "Program Managers", "Directors"],
    color: "#1E6FA8",
  },
  "studio-v1": {
    tagline: "Editorial project spotlight with modular creative blocks",
    preview: "Portfolio-first hierarchy with expressive rhythm",
    bestFor: ["Designers", "Creative Technologists", "Brand Strategists"],
    color: "#C05A2B",
  },
  "bento-v1": {
    tagline: "Apple-inspired modular grid layout",
    preview: "Clean cards, subtle shadows, modern aesthetics",
    bestFor: ["Product Managers", "Designers", "Strategists"],
    color: "#007AFF",
  },
  "terminal-v1": {
    tagline: "VS Code-inspired developer theme",
    preview: "Syntax highlighting, file tree, dark mode",
    bestFor: ["Engineers", "DevOps", "Data Scientists"],
    color: "#0D1117",
  },
  "editorial-v1": {
    tagline: "Magazine-style typography",
    preview: "Multi-column layout, elegant serifs, pull quotes",
    bestFor: ["Executives", "Writers", "Consultants"],
    color: "#1A1A1A",
  },
  "noir-v1": {
    tagline: "Dark luxury aesthetic",
    preview: "Pure black, gradient accents, premium feel",
    bestFor: ["C-Suite", "Directors", "VIPs"],
    color: "#000000",
  },
  "signal-v1": {
    tagline: "Engineering-first signal density for fast recruiter scans",
    preview: "Impact bullets and technical stack clustering",
    bestFor: ["Software Engineers", "Platform Engineers", "DevOps"],
    color: "#1F9D8E",
  },
};
