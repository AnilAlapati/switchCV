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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
      <header className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {caption && <p className="text-sm text-slate-300">{caption}</p>}
      </header>

      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            className="flex flex-col gap-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-900/70"
          >
            <span className="text-sm font-semibold text-cyan-200">
              {link.title}
            </span>
            <span className="text-sm text-slate-300">{link.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
