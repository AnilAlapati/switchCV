import Link from "next/link";

export function HomeFooterCta() {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-pink-600/20 p-10 text-center backdrop-blur-xl shadow-2xl shadow-black/40">
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">
        Ready when you are
      </p>
      <h3 className="text-3xl font-bold mt-3">
        Launch your next opportunity with a resume you control end-to-end.
      </h3>
      <p className="text-slate-200 mt-3 max-w-2xl mx-auto">
        Create a professional resume with AI assistance and take control of your
        job search with privacy features and view tracking.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <Link
          href="/auth?mode=signup"
          className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200"
        >
          Create my resume
        </Link>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-white/20 text-white/90 hover:bg-white/10 transition"
        >
          Explore the dashboard
        </Link>
      </div>
    </section>
  );
}
