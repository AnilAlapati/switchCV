import Link from "next/link";

export function HomeFooterCta() {
  return (
    <section className="glass-panel p-10 text-center shadow-2xl">
      <p className="text-sm uppercase tracking-[0.3em] text-[#2C4A3B]/70 font-bold">
        Ready when you are
      </p>
      <h3 className="text-3xl font-bold mt-3">
        Launch your next opportunity with a resume you control end-to-end.
      </h3>
      <p className="text-[#1A2F25]/70 mt-3 max-w-2xl mx-auto">
        Create a professional resume with AI assistance and take control of your
        job search with privacy features and view tracking.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <Link
          href="/auth?mode=signup"
          className="inline-flex items-center justify-center glass-button text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 bg-[#2C4A3B] hover:bg-[#1A2F25] border-transparent"
        >
          Create my resume
        </Link>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-[#1A2F25]/20 text-[#1A2F25] hover:bg-[#1A2F25]/5 transition font-medium"
        >
          Explore the dashboard
        </Link>
      </div>
    </section>
  );
}
