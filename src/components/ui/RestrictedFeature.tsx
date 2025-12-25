"use client";

import React from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  getTierRestrictionMessage,
  hasFeatureAccess,
  TierRestrictionKey,
} from "@/lib/utils/tier-restrictions";

interface RestrictedFeatureProps {
  children: React.ReactNode;
  requiredTier?: "premium" | "enterprise";
  messageKey?: TierRestrictionKey;
  customMessage?: string;
  showTooltip?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  disabledClassName?: string;
  onAccessDenied?: () => void;
}

/**
 * RestrictedFeature - A wrapper component for premium/enterprise-only features
 *
 * This component centralizes tier restriction logic and messaging across the app.
 * It automatically disables the feature and shows a tooltip for users without access.
 *
 * @example
 * ```tsx
 * <RestrictedFeature messageKey="AI_EDIT">
 *   <button>AI Edit</button>
 * </RestrictedFeature>
 * ```
 */
export function RestrictedFeature({
  children,
  requiredTier = "premium",
  messageKey = "PREMIUM_FEATURE",
  customMessage,
  showTooltip = true,
  tooltipPosition = "top",
  disabledClassName = "opacity-50 cursor-not-allowed pointer-events-none",
  onAccessDenied,
}: RestrictedFeatureProps) {
  const { tier } = useUserProfile();
  const hasAccess = hasFeatureAccess(tier, requiredTier);

  // Get the restriction message
  const restrictionMessage =
    customMessage || getTierRestrictionMessage(messageKey);

  // Handle access denied callback - must be called before any early returns
  React.useEffect(() => {
    if (!hasAccess && onAccessDenied) {
      onAccessDenied();
    }
  }, [hasAccess, onAccessDenied]);

  // If user has access, render children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // If no tooltip, just render disabled children
  if (!showTooltip) {
    return <div className={disabledClassName}>{children}</div>;
  }

  // Render with tooltip
  return (
    <Tooltip content={restrictionMessage} position={tooltipPosition}>
      <div className={disabledClassName}>{children}</div>
    </Tooltip>
  );
}

/**
 * Hook to check feature access in functional components
 *
 * @example
 * ```tsx
 * const { hasAccess, restrictionMessage } = useFeatureAccess("premium", "AI_EDIT");
 * ```
 */
export function useFeatureAccess(
  requiredTier: "premium" | "enterprise" = "premium",
  messageKey: TierRestrictionKey = "PREMIUM_FEATURE"
) {
  const { tier } = useUserProfile();
  const hasAccess = hasFeatureAccess(tier, requiredTier);
  const restrictionMessage = getTierRestrictionMessage(messageKey);

  return {
    hasAccess,
    restrictionMessage,
    tier,
    isBasic: tier === "basic",
    isPremium: tier === "premium",
    isEnterprise: tier === "enterprise",
  };
}
