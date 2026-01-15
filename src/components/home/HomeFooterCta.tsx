import Link from "next/link";
import { motion } from "framer-motion";

export function HomeFooterCta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="bg-white border-2 border-black p-12 md:p-20 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
    >
      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-black" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black" />

      <div className="relative z-10 space-y-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.5em] text-blue-600 font-black bg-blue-100 inline-block px-4 py-1.5 font-mono">
            Ready when you are
          </p>
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-black tracking-tight leading-[1.05]">
            Launch your next opportunity <br className="hidden md:block" /> with a resume you control.
          </h3>
        </div>

        <p className="text-gray-600 text-lg md:text-xl font-sans max-w-2xl mx-auto leading-relaxed">
          Create a professional resume with AI assistance and take control of your
          job search with privacy features and view tracking.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center bg-black text-white px-10 py-5 font-bold transition-all hover:bg-gray-800 active:scale-95 border-2 border-black"
          >
            Create my resume
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center px-10 py-5 border-2 border-black text-black hover:bg-gray-100 transition-all font-bold"
          >
            Explore the dashboard
          </Link>
        </div>

        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">
          Free to get started · No credit card required
        </p>
      </div>
    </motion.section>
  );
}
