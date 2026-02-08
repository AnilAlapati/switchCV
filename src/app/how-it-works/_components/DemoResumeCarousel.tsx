import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { demoResumes } from "../content";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import type { DemoResumeColor } from "../types";

export function DemoResumeCarousel() {
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className="mt-12 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-2xl md:text-3xl font-serif font-bold mb-4 text-center">
        See Live Examples
      </h3>
      <p className="text-gray-600 mb-8 text-center text-lg">
        Explore how our AI transforms different types of resumes
      </p>
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex gap-6"
          animate={
            prefersReducedMotion || isPaused ? {} : { x: ["-0%", "-50%"] }
          }
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
          style={{ width: "fit-content" }}
        >
          {demoResumes.map((resume) => (
            <DemoResumeCard key={resume.id} {...resume} />
          ))}
          {demoResumes.map((resume) => (
            <DemoResumeCard key={`${resume.id}-dup`} {...resume} />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

interface DemoResumeCardProps {
  id: string;
  title: string;
  color: DemoResumeColor;
}

function DemoResumeCard({ id, title, color }: DemoResumeCardProps) {
  const colorMap = {
    blue: {
      gradient: "from-blue-400 to-blue-600",
    },
    indigo: {
      gradient: "from-indigo-400 to-indigo-600",
    },
    purple: {
      gradient: "from-purple-400 to-purple-600",
    },
    rose: {
      gradient: "from-rose-400 to-rose-600",
    },
  }[color];

  return (
    <Link href={`/demo-resumes/${id}`}>
      <motion.div
        className="relative rounded-2xl overflow-hidden cursor-pointer min-w-[212px] h-[120px] group shadow-xl border-2 border-white/20"
        whileHover={{ y: -8, scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${colorMap.gradient}`} />

        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 opacity-90">
              Demo #{id}
            </span>
            <h4 className="font-serif font-bold text-lg text-white leading-tight mt-1">
              {title}
            </h4>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
              </div>
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                AI
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-white font-semibold group-hover:gap-1.5 transition-all">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all" />
      </motion.div>
    </Link>
  );
}
