import { motion } from "motion/react";
import type { UserMode } from "../types";

export function HeroSection({ mode }: { mode: UserMode }) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-4xl mx-auto text-center">
        <motion.span
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400 mb-4 block"
        >
          {mode === "jobseeker" ? "Under the Hood" : "Recruiter Intelligence"}
        </motion.span>
        <motion.h1
          key={`title-${mode}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-black mb-6"
        >
          {mode === "jobseeker" ? "How Our AI Agents Work" : "AI-Powered Recruiting"}
        </motion.h1>
        <motion.p
          key={`desc-${mode}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-600 font-light max-w-2xl mx-auto"
        >
          {mode === "jobseeker"
            ? "Four elite AI agents collaborate to transform your resume-the Scout, the Architect, the Writer, and the Auditor. Together, they produce results no single AI can match."
            : "Two specialized agents work together to streamline your recruiting-one understands your requirements in natural language, the other searches and analyzes candidate profiles to find the best matches."}
        </motion.p>
      </div>
    </section>
  );
}
