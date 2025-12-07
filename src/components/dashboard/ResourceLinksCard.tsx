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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-5 space-y-1">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {caption && <p className="text-sm text-slate-500">{caption}</p>}
      </header>

      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-md"
          >
            <span className="text-sm font-bold text-blue-600">
              {link.title}
            </span>
            <span className="text-sm text-slate-500">{link.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
