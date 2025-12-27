import Link from "next/link";
import { motion } from "framer-motion";

export function HomeFooterCta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="glass-panel-deep p-12 md:p-20 text-center shadow-2xl relative overflow-hidden rounded-[3rem]"
    >
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#4ADE80]/10 rounded-full blur-[100px] -ml-32 -mt-32" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#2DD4BF]/10 rounded-full blur-[100px] -mr-32 -mb-32" />

      <div className="relative z-10 space-y-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#2C4A3B] font-black bg-[#4ADE80]/10 inline-block px-4 py-1.5 rounded-full">
            Ready when you are
          </p>
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1A2F25] tracking-tight leading-[1.05]">
            Launch your next opportunity <br className="hidden md:block" /> with a resume you control.
          </h3>
        </div>

        <p className="text-[#1A2F25]/70 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          Create a professional resume with AI assistance and take control of your
          job search with privacy features and view tracking.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center glass-button-glow text-white px-10 py-5 rounded-[1.25rem] font-black transition-all shadow-xl hover:shadow-[#2C4A3B]/30 active:scale-95 bg-[#2C4A3B]"
          >
            Create my resume
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center px-10 py-5 rounded-[1.25rem] border-2 border-[#1A2F25]/10 text-[#1A2F25] hover:bg-white/50 transition-all font-bold backdrop-blur-sm"
          >
            Explore the dashboard
          </Link>
        </div>

        <p className="text-[10px] text-[#2C4A3B]/40 font-bold uppercase tracking-[0.2em]">
          Free to get started · No credit card required
        </p>
      </div>
    </motion.section>
  );
}
