"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";

interface ResourceLink {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

interface ResourceLinksCardProps {
  title: string;
  caption?: string;
  links: ResourceLink[];
  lockForBasic?: boolean;
}

export function ResourceLinksCard({
  title,
  caption,
  links,
  lockForBasic = false,
}: ResourceLinksCardProps): ReactElement {
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

  const cardContent = (
    <section className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <header className="mb-5 space-y-1 border-b-2 border-gray-100 pb-4">
        <h2 className="text-lg font-serif font-bold text-black">{title}</h2>
        {caption && <p className="text-sm text-gray-500 font-sans">{caption}</p>}
      </header>

      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            className="flex flex-col gap-1 border-2 border-gray-200 bg-white p-4 transition-all hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group"
          >
            <span className="text-sm font-mono font-bold text-blue-600 uppercase tracking-wider group-hover:text-black">
              {link.title}
            </span>
            <span className="text-sm text-gray-600 font-sans">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );

  if (lockForBasic && isBasic) {
    return (
      <PremiumFeatureLock
        featureName={title}
        description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
        className="h-full"
      >
        {cardContent}
      </PremiumFeatureLock>
    );
  }

  return cardContent;
}
