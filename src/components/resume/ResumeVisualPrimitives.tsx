import React from "react";

export type TimelineItem = {
  headline: string;
  subline?: string;
  meta?: string;
  description?: string;
  bullets?: string[];
  technologies?: string[];
  url?: string;
};

export const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="border border-black/10 bg-white p-6 shadow-lg">
    <header className="mb-6 flex items-center gap-3 border-b border-black/5 pb-4">
      <div className="flex h-12 w-12 items-center justify-center bg-black text-lg font-serif font-bold text-white">
        {title.slice(0, 1)}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400 font-sans">
          Section
        </p>
        <h3 className="text-xl font-serif font-bold text-black">{title}</h3>
      </div>
    </header>
    <div>{children}</div>
  </section>
);

const iconBase =
  "flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-gray-700";

const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span className={iconBase} aria-hidden>
    {children}
  </span>
);

export const MailIcon = () => (
  <IconWrapper>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path d="M3 7l9 6 9-6" />
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
    </svg>
  </IconWrapper>
);

export const PhoneIcon = () => (
  <IconWrapper>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path d="M5 4h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2 15 15 0 01-6-2.2 15 15 0 01-4.8-4.8A15 15 0 014 6a2 2 0 011-2z" />
    </svg>
  </IconWrapper>
);

export const LocationIcon = () => (
  <IconWrapper>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path d="M12 21s7-4.35 7-10A7 7 0 005 11c0 5.65 7 10 7 10z" />
      <circle cx="12" cy="11" r="3" />
    </svg>
  </IconWrapper>
);

export const LinkIcon = () => (
  <IconWrapper>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a4 4 0 00-5.66-5.66l-1.5 1.5" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a4 4 0 105.66 5.66l1.5-1.5" />
    </svg>
  </IconWrapper>
);

export const CodeIcon = () => (
  <IconWrapper>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path d="M8 6l-6 6 6 6" />
      <path d="M16 6l6 6-6 6" />
    </svg>
  </IconWrapper>
);
