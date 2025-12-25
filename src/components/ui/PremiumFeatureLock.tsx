"use client";

import Link from "next/link";
import { Lock, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PremiumFeatureLockProps {
  /** The feature name to display in the heading */
  featureName: string;
  /** The description message explaining the premium feature */
  description: string;
  /** Optional icon to display, defaults to Lock */
  icon?: LucideIcon;
  /** Children to render behind the lock overlay */
  children: ReactNode;
  /** Optional custom className for the overlay container */
  className?: string;
  /** Whether to blur the background content, defaults to true */
  blurBackground?: boolean;
  /** Opacity level for disabled content (0-100), defaults to 20 */
  disabledOpacity?: number;
  /** Maximum width for the description text, defaults to 200px */
  maxDescriptionWidth?: number;
}

/**
 * PremiumFeatureLock - A reusable overlay component for premium/enterprise-only features
 *
 * This component creates a visual lock overlay with a centered upgrade prompt,
 * while rendering the locked content in a disabled state behind it.
 *
 * @example
 * ```tsx
 * <PremiumFeatureLock
 *   featureName="Growth Path"
 *   description="Unlock personalized priority actions with Premium or Enterprise."
 * >
 *   <YourFeatureComponent />
 * </PremiumFeatureLock>
 * ```
 */
export function PremiumFeatureLock({
  featureName,
  description,
  icon: Icon = Lock,
  children,
  className = "",
  blurBackground = true,
  disabledOpacity = 20,
  maxDescriptionWidth = 200,
}: PremiumFeatureLockProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Lock Overlay */}
      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center ${blurBackground ? "bg-white/40 backdrop-blur-[2px]" : "bg-white/60"
          } p-6 text-center`}
      >
        <div className="p-4 rounded-2xl bg-white shadow-xl mb-4">
          <Icon className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-bold text-[#1A2F25] mb-2">{featureName}</h3>
        <p
          className="text-sm text-[#1A2F25]/60 mb-6"
          style={{ maxWidth: `${maxDescriptionWidth}px` }}
        >
          {description}
        </p>
        <Link
          href="/profile/subscription"
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          Upgrade Now
        </Link>
      </div>

      {/* Disabled Content */}
      <div
        className="pointer-events-none"
        style={{ opacity: disabledOpacity / 100 }}
      >
        {children}
      </div>
    </div>
  );
}
