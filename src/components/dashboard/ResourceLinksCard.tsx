"use client";

import Link from "next/link";

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
}

export function ResourceLinksCard({
  title,
  caption,
  links,
}: ResourceLinksCardProps) {
  return (
    <section className="glass-panel rounded-3xl p-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/10">
      <header className="mb-5 space-y-1">
        <h2 className="text-lg font-bold text-[#1A2F25]">{title}</h2>
        {caption && <p className="text-sm text-[#1A2F25]/60">{caption}</p>}
      </header>

      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            className="flex flex-col gap-1 rounded-2xl border border-[#1A2F25]/5 bg-white/40 p-4 transition-all hover:bg-white/60 hover:shadow-sm hover:border-indigo-500/20 group"
          >
            <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
              {link.title}
            </span>
            <span className="text-sm text-[#1A2F25]/70">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
